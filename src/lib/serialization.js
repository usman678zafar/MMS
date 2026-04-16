// Utility functions for serializing MongoDB documents for client components

export const serializeDocument = (doc) => {
  if (!doc) return doc;
  
  // Handle arrays of documents
  if (Array.isArray(doc)) {
    return doc.map(serializeDocument);
  }
  
  // Handle single document
  const serialized = { ...doc };
  
  // Convert ObjectId to string and remove the original
  if (serialized._id) {
    serialized.id = serialized._id.toString();
    serialized._id = undefined;
  }
  
  // Convert any other ObjectID fields
  Object.keys(serialized).forEach(key => {
    if (serialized[key] && typeof serialized[key] === 'object' && serialized[key].toString && serialized[key].constructor.name === 'ObjectId') {
      // This is definitely an ObjectId, convert to string
      serialized[key] = serialized[key].toString();
    }
  });
  
  return serialized;
};

export const serializeDocuments = (docs) => {
  return docs.map(serializeDocument);
};
