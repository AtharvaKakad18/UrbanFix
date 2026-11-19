import { searchAddress, reverseGeocode } from '../services/geocoderService.js';

export const searchLocations = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const results = await searchAddress(q);
    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

export const reverseLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (lat == null || lng == null) {
      return res.status(400).json({
        success: false,
        error: { message: 'lat and lng parameters are required.' },
      });
    }

    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
