import mongodb, { MongoClient } from 'mongodb';

let instance;
let onReadyCallbacks = [];

export function onReady(callback: Function): void {
    if (typeof callback !== 'function') {
        throw new Error(`Function for callback onReady is not a function.`);
    }

    const index = onReadyCallbacks.findIndex((func) => func === callback);
    if (index !== -1) {
        throw new Error(`Function already exists in callback.`);
    }

    onReadyCallbacks.push(callback);
}

/**
 * Return an instance of the Database after Database is ready.
 *
 * @return {Database} Singleton of your Database Connection
 */
export async function getDatabase(): Promise<Database> {
    if (!instance) {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (!instance) {
                    return;
                }

                resolve(instance);
                clearInterval(interval);
            }, 500);
        });
    }

    return instance;
}

export class Database {
    client: MongoClient;
    establishingConnection: boolean;
    collections: Array<string>;
    databaseName: string;
    db: mongodb.Db;

    constructor(
        url: string,
        databasename: string,
        collections: string[] = [],
        username: string = null,
        password: string = null
    ) {
        if (instance) {
            return instance;
        }

        this.establishingConnection = true;

        /** @type {mongodb.MongoClient} */
        this.client = null;
        this.collections = collections;
        this.databaseName = databasename;

        if (username && password) {
            console.log(`[MongoDB] Establishing connection with username and password.`);
            this.client = new MongoClient(url, {
                useUnifiedTopology: true,
                useNewUrlParser: true,
                auth: {
                    user: username,
                    password: password,
                },
            });
        } else {
            console.log(`[MongoDB] Establishing connection without using a username or password.`);
            this.client = new MongoClient(url, {
                useUnifiedTopology: true,
                useNewUrlParser: true,
            });
        }

        this.establishConnection();
    }

    async establishConnection() {
        await this.client.connect().catch((err) => {
            if (err) {
                console.log(err);
                console.error(`[MongoDB] Failed to establish connection to database. Did you specify the correct url?`);
                process.exit(1);
            }
        });

        this.db = this.client.db(this.databaseName);
        this.generateCollections();
        instance = this;

        for (let i = 0; i < onReadyCallbacks.length; i++) {
            onReadyCallbacks[i]();
        }
    }

    async generateCollections() {
        if (this.collections.length <= 0) {
            console.log(`[MongoDB] No collections were specified for creation.`);
            return;
        }

        const database = this.db;
        const collectionCursor = database.listCollections();
        const collections = await collectionCursor.toArray(); // { name: 'whatever' }
        let totalCollections = collections.length;

        if (collections.length <= 0) {
            for (let i = 0; i < this.collections.length; i++) {
                const collectionName = this.collections[i];
                const newCollection = database.createCollection(collectionName);
                console.log(`[MongoDB] Created new collection '${collectionName}'`);
            }

            console.log(`[MongoDB] Connection Complete! Utilizing ${totalCollections} collections.`);
            return;
        }

        const collectionsNotFound = this.collections.filter((collectionName) => {
            return !collections.find((existingData) => existingData && existingData.name === collectionName);
        });

        if (collectionsNotFound.length <= 0) {
            console.log(`[MongoDB] Connection Complete! Utilizing ${totalCollections} collections.`);
            return;
        }

        for (let i = 0; i < collectionsNotFound.length; i++) {
            const collectionName = collectionsNotFound[i];
            const newCollection = database.createCollection(collectionName);
            console.log(`[MongoDB] Created new collection '${collectionName}'`);
        }

        console.log(
            `[MongoDB] Connection Complete! Utilizing ${totalCollections + collectionsNotFound.length} collections.`
        );
    }

    /**
     * @param {string} fieldName Field we want to select.
     * @param {any} fieldValue Field value we want to find.
     * @param {string} collection Name of the collection.
     * @returns {Promise<T | null>} A single document.
     * @template T
     */
    async fetchData(fieldName, fieldValue, collection) {
        if (fieldName === '_id') {
            fieldValue = new mongodb.ObjectID(fieldValue);
        }

        const result = await this.db.collection(collection).findOne({ [fieldName]: fieldValue });
        return result;
    }

    /**
     * Fetch all with a specific field and a specific value.
     * @param {string} fieldName Field we want to modify.
     * @param {any} fieldValue Field value we want to find.
     * @param {string} collection Name of the collection.
     * @returns {Promise<Array<T>>} An array of documents.
     * @template T
     */
    async fetchAllByField(fieldName, fieldValue, collection) {
        if (fieldName === '_id') {
            fieldValue = new mongodb.ObjectID(fieldValue);
        }

        const results = await this.db
            .collection(collection)
            .find({ [fieldName]: fieldValue })
            .toArray();

        if (results.length <= 0) {
            return [];
        }

        return results;
    }

    /**
     * Fetch all with a specific field and a specific value.
     * @param {string} objectName Object we want to find.
     * @param {string} fieldName Field we want to find.
     * @param {any} fieldValue Field value we want to find.
     * @param {string} collection Name of the collection.
     * @returns {Promise<Array<T>>} An array of documents.
     * @template T
     */
    async fetchAllByObjectProperty(objectName, fieldName, fieldValue, collection) {
        const results = await this.db
            .collection(collection)
            .find( { [`${objectName}.${fieldName}`]: fieldValue } )
            .toArray();

        if (results.length <= 0) {
            return [];
        }

        return results;
    }

    /**
     * Insert a document and return the ID.
     * @param {T} document
     * @param {string} collection
     * @param {boolean} returnDocument
     * @returns {Promise<T | null>} Document
     * @template T
     */
    async insertData(document, collection, returnDocument = false) {
        const newDocument = await this.db.collection(collection).insertOne(document);
        const id = newDocument.insertedId;

        if (!returnDocument) {
            return null;
        }

        return await this.db.collection(collection).findOne({ _id: new mongodb.ObjectID(id) });
    }

    /**
     * Update an ID in the database partially.
     * @param {string} id
     * @param {T} partialObjectData
     * @param {string} collection
     * @returns {boolean}
     * @template T
     */
    async updatePartialData(id, partialObjectData, collection) {
        try {
            await this.db
                .collection(collection)
                .findOneAndUpdate({ _id: new mongodb.ObjectID(id) }, { $set: { ...partialObjectData } });

            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    /**
     * Update an ID in the database partially, with custom aggregation.
     * @param {string} id
     * @param {T} partialObjectData
     * @param {string} collection
     * @returns {boolean}
     * @template T
     */
    async updatePartialDataAggregation(id, partialObjectData, collection) {
        try {
            await this.db.collection(collection).findOneAndUpdate({ _id: new mongodb.ObjectID(id) }, partialObjectData);

            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    /**
     * Delete data by id.
     * @param {string} id
     * @param {string} collection
     * @returns {boolean}
     */
    async deleteById(id, collection) {
        try {
            await this.db.collection(collection).findOneAndDelete({ _id: new mongodb.ObjectID(id) });
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Fetch all data in a collection.
     * @param {string} collection
     * @returns {Promise<Array<T>>}
     * @template T
     */
    async fetchAllData(collection) {
        return await this.db.collection(collection).find().toArray();
    }

    /**
     * Select specific fields from the collection; and return all data.
     * @param {string} collection
     * @param {Array<string>} fieldNames
     * @returns {Array<T>}
     * @template T
     */
    async selectData(collection, fieldNames) {
        const selectData = {
            _id: 1,
        };

        fieldNames.forEach((name) => {
            selectData[name] = 1;
        });

        return await this.db
            .collection(collection)
            .find({})
            .project({ ...selectData })
            .toArray();
    }

    /**
     * Update partial data based on other parameters.
     * @param {string} fieldName The field name.
     * @param {string} fieldValue The field value to update based on fieldName.
     * @param {T} partialObjectData An object of data to update.
     * @param {string} collection
     * @template T
     */
    async updateDataByFieldMatch(fieldName, fieldValue, partialObjectData, collection) {
        if (fieldName === '_id') {
            fieldValue = new mongodb.ObjectID(fieldValue);
        }

        await this.db
            .collection(collection)
            .findOneAndUpdate({ [fieldName]: fieldValue }, { $set: { ...partialObjectData } });
    }

    /**
     *
     * @param {string} oldValue
     * @param {string} fieldName
     * @param {any} fieldValue
     * @param {string} collection
     */
    async replaceField(oldValue, fieldName, fieldValue, collection) {
        await this.db
            .collection(collection)
            .updateMany({ [fieldName]: oldValue }, { $set: { [fieldName]: fieldValue } });
    }
}
