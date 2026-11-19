import 'dotenv/config';

import app from './app.js';
import { connectDB } from './config/db.js';
import cron from 'node-cron';
import { Report } from './models/Report.js';
import { STATUSES } from './constants/index.js';
import { calculateReportPriority } from './services/priorityEngine.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Nightly cron at midnight (00:00): Recalculate priority scores & Auto-close resolved reports
    cron.schedule('0 0 * * *', async () => {
      console.log('[Cron Job] Running nightly maintenance tasks...');
      try {
        // 1. Auto-close resolved reports after AUTO_CLOSE_DAYS
        const autoCloseDays = parseInt(process.env.AUTO_CLOSE_DAYS || '3');
        const cutoffDate = new Date(Date.now() - autoCloseDays * 24 * 60 * 60 * 1000);

        const expiredReports = await Report.find({
          status: STATUSES.RESOLVED,
          'resolution.resolvedAt': { $lte: cutoffDate },
        });

        for (const report of expiredReports) {
          report.status = STATUSES.CLOSED;
          report.citizenVerification = {
            accepted: true,
            comment: `Auto-closed after ${autoCloseDays} days without citizen objection.`,
            at: new Date(),
          };
          report.workLogs.push({
            stage: STATUSES.CLOSED,
            remarks: `Automatically closed after ${autoCloseDays} days inactivity.`,
            timestamp: new Date(),
          });
          await report.save();
        }
        if (expiredReports.length > 0) {
          console.log(`[Cron Job] Auto-closed ${expiredReports.length} resolved reports.`);
        }

        // 2. Batch recalculate priorities for active reports (to account for aging days)
        const activeReports = await Report.find({
          status: { $nin: [STATUSES.CLOSED, STATUSES.REJECTED] },
        });

        for (const r of activeReports) {
          const { priorityScore, priority } = await calculateReportPriority(r);
          r.priorityScore = priorityScore;
          r.priority = priority;
          await r.save();
        }
        console.log(`[Cron Job] Recalculated priorities for ${activeReports.length} active reports.`);
      } catch (cronErr) {
        console.error('[Cron Job] Error executing nightly cron:', cronErr.message);
      }
    });

    app.listen(PORT, () => {
      console.log(`[UrbanFix Server] Server running on http://localhost:${PORT}`);
      console.log(`[UrbanFix Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`[UrbanFix Server] Health Check: http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error('[UrbanFix Server] Fatal startup error:', err);
    process.exit(1);
  }
};

startServer();
