export const PROPERTY_IMAGE_BUCKET = 'property-images'
export const STORAGE_REFERENCE_PREFIX = `storage://${PROPERTY_IMAGE_BUCKET}/`

export function createStorageReference(path: string) {
  return `${STORAGE_REFERENCE_PREFIX}${path}`
}

function decodePath(path: string) {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

export function getStoragePath(value: string) {
  if (!value) return null

  if (value.startsWith(STORAGE_REFERENCE_PREFIX)) {
    return value.slice(STORAGE_REFERENCE_PREFIX.length)
  }

  const markers = [
    `/storage/v1/object/public/${PROPERTY_IMAGE_BUCKET}/`,
    `/storage/v1/object/sign/${PROPERTY_IMAGE_BUCKET}/`,
  ]

  for (const marker of markers) {
    const markerIndex = value.indexOf(marker)
    if (markerIndex !== -1) {
      return decodePath(value.slice(markerIndex + marker.length).split('?')[0])
    }
  }

  return null
}

export function toStorageReference(value: string) {
  const path = getStoragePath(value)
  return path ? createStorageReference(path) : value
}
