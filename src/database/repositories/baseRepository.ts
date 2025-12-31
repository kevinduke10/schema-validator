import { Collection, ObjectId, Filter, UpdateFilter, FindOptions, Document } from 'mongodb';

/**
 * Base repository interface for MongoDB operations
 */
export interface IRepository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id' | '_id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, updates: Partial<Omit<T, 'id' | '_id' | 'createdAt'>>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  findOne(filter: Filter<Document>): Promise<T | null>;
  findMany(filter: Filter<Document>, options?: FindOptions<Document>): Promise<T[]>;
}

/**
 * Base MongoDB repository implementation
 */
export abstract class BaseRepository<T extends { id: string; createdAt: Date; updatedAt: Date }> implements IRepository<T> {
  protected collection: Collection<Document>;

  constructor(collection: Collection<Document>) {
    this.collection = collection;
  }

  /**
   * Convert MongoDB _id to string id
   */
  protected toEntity(doc: any): T {
    if (!doc) return doc;
    const { _id, ...rest } = doc;
    return {
      ...rest,
      id: _id.toString(),
    } as T;
  }

  /**
   * Convert string id to MongoDB ObjectId
   */
  protected toObjectId(id: string): ObjectId {
    if (!ObjectId.isValid(id)) {
      throw new Error(`Invalid ID format: ${id}`);
    }
    return new ObjectId(id);
  }

  /**
   * Find all documents
   */
  async findAll(): Promise<T[]> {
    const docs = await this.collection.find({}).toArray();
    return docs.map(doc => this.toEntity(doc));
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.collection.findOne({ _id: this.toObjectId(id) });
      return doc ? this.toEntity(doc) : null;
    } catch (error) {
      // If ID format is invalid, return null instead of throwing
      return null;
    }
  }

  /**
   * Create a new document
   */
  async create(data: Omit<T, 'id' | '_id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = new Date();
    const doc = {
      ...data,
      createdAt: now,
      updatedAt: now,
    } as any;

    const result = await this.collection.insertOne(doc);
    return this.toEntity({ ...doc, _id: result.insertedId });
  }

  /**
   * Update a document
   */
  async update(id: string, updates: Partial<Omit<T, 'id' | '_id' | 'createdAt'>>): Promise<T | null> {
    try {
      const updateDoc: UpdateFilter<Document> = {
        $set: {
          ...updates,
          updatedAt: new Date(),
        } as any,
      };

      const result = await this.collection.findOneAndUpdate(
        { _id: this.toObjectId(id) },
        updateDoc,
        { returnDocument: 'after' }
      );

      return result ? this.toEntity(result) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.collection.deleteOne({ _id: this.toObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Find one document by filter
   */
  async findOne(filter: Filter<Document>): Promise<T | null> {
    const doc = await this.collection.findOne(filter);
    return doc ? this.toEntity(doc) : null;
  }

  /**
   * Find many documents by filter
   */
  async findMany(filter: Filter<Document>, options?: FindOptions<Document>): Promise<T[]> {
    const docs = await this.collection.find(filter, options).toArray();
    return docs.map(doc => this.toEntity(doc));
  }
}

