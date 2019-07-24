const uuidv1 = require('uuid/v1')
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const f = function(config) {
	this.config = config;
	this.client = new MongoClient(config.connectionUrl, { useNewUrlParser: true })
}

f.prototype.getDB = function() {
	return (
		this.client.connect()
			.then(() => this.client.db(this.config.databaseName))
	);
}
f.prototype.findRestaurantByCity = function(city, params = {}) {
	const limit = parseInt(params['limit']) || 10;
	const offset = parseInt(params['offset']) || 0;
	return (
		this.getDB()
			.then(db => 
				db.collection(this.config.collectionName)
					.find({ 
						'address line 2': { 
							$regex: `.*${city}.*`, 
							$options: 'i' 
						} 
					}) 
					.limit(limit).skip(offset)
					.project({ _id: 1 })
					.map(v => v._id)
			)
			.then(result => result.toArray())
	);
}


f.prototype.countRestaurantsInCity = function(city) {
	return (
		this.getDB()
			.then(db => 
				db.collection(this.config.collectionName)
					.find({ 
						'address line 2': { 
							$regex: `.*${city}.*`, 
							$options: 'i' 
						} 
					})
					.count()
			)
	);
}

f.prototype.findAllCities = function() {
	return (
		this.getDB()
			.then(db => 
				db.collection(this.config.collectionName)
					.distinct('address line 2')
		)
	);
}

f.prototype.findRestaurantById = function(id) {
	return (
		this.getDB()
			.then(db => 
				db.collection(this.config.collectionName)
					.find({ _id: new ObjectId(id) })
					.toArray()
			)
	);
}

f.prototype.insertRestaurant = function(params) {
	//params._id = uuidv1().substring(0, 8);
	return (
		this.getDB()
			.then(db => 
				db.collection(this.config.collectionName)
					.insertOne(params)
			).then(result => result.ops[0])
	);
}

f.prototype.form2json = function(form) {
	const result = {}

	for (let k of Object.keys(form))
		result[k] = form[k]

	return (result)
}

f.prototype.MANDATORY_FIELDS = [ 'url', 'address', 'city', 'name', 'outcode', 'postcode', 'type_of_food' ]
f.prototype.validateRestaurant = function(form) {
	for (let f of this.MANDATORY_FIELDS) {
		if (!(f in form))
			return (false);
	}
	return (true);
}

module.exports = (config) => {
	return (new f(config))
}
