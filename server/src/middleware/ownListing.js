import Listing from "../models/Listing.js";

export async function ownsListing(req, res, next) {
  try {
    const id = req.params.id || req.body.id;
    if (!id) return res.status(400).json({ message: "Listing id required" });
    const row = await Listing.findById(id).select("vendor").lean();
    if (!row) return res.status(404).json({ message: "Listing not found" });

    const uid = String(req.user.id || req.user._id);
    if (String(row.vendor) !== uid) return res.status(403).json({ message: "You do not own this listing" });

    next();
  } catch (e) { next(e); }
}
