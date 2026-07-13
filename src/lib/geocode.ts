// Keyless reverse geocoding via BigDataCloud's free client endpoint (no API key,
// no billing). Turns GPS coords into city + pincode so owners don't type them.
export interface GeoResult {
  city: string;
  pincode: string;
  area: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (!res.ok) return null;
    const d = (await res.json()) as {
      city?: string;
      locality?: string;
      postcode?: string;
      principalSubdivision?: string;
    };
    return {
      city: d.city || d.locality || d.principalSubdivision || "",
      pincode: d.postcode || "",
      area: d.locality || "",
    };
  } catch {
    return null;
  }
}
