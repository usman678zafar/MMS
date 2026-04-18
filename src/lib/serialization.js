// Utility functions for serializing MongoDB documents for client components

// More comprehensive ObjectId detection
const isObjectId = (obj) => {
  if (!obj) return false;

  // Check for MongoDB ObjectId patterns
  if (obj.constructor && obj.constructor.name === "ObjectId") {
    return true;
  }

  // Check for BSON ObjectId
  if (obj._bsontype === "ObjectId") {
    return true;
  }

  // Check for buffer-based ObjectId (common in MongoDB)
  if (
    obj.buffer &&
    typeof obj.buffer === "object" &&
    obj.buffer instanceof Uint8Array
  ) {
    return true;
  }

  // Check if object has ObjectId-like properties
  if (
    typeof obj === "object" &&
    obj.toString &&
    typeof obj.toString === "function"
  ) {
    const str = obj.toString();
    if (str && str.match(/^[0-9a-f]{24}$/i)) {
      return true;
    }
  }

  return false;
};

export const serializeDocument = (doc) => {
  if (!doc) return doc;

  // Handle arrays of documents
  if (Array.isArray(doc)) {
    return doc.map(serializeDocument);
  }

  // Handle single document
  const serialized = { ...doc };

  // Convert ObjectId to string and remove the original
  if (isObjectId(serialized._id)) {
    serialized.id = serialized._id.toString();
    serialized._id = undefined;
  }

  // Convert any other ObjectId fields recursively
  Object.keys(serialized).forEach((key) => {
    if (isObjectId(serialized[key])) {
      // This is definitely an ObjectId, convert to string
      serialized[key] = serialized[key].toString();
    } else if (serialized[key] instanceof Date) {
      // Convert Date to ISO string
      serialized[key] = serialized[key].toISOString();
    } else if (
      serialized[key] &&
      typeof serialized[key] === "object" &&
      !Array.isArray(serialized[key])
    ) {
      // Recursively serialize nested objects (but not arrays)
      serialized[key] = serializeDocument(serialized[key]);
    }
  });

  return serialized;
};

export const serializeDocuments = (docs) => {
  return docs.map(serializeDocument);
};
