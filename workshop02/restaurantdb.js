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

f.prototype.findCitiesByName = function(city) {
	return (
		this.getDB()
			.then(db => 
				db.collection(this.config.collectionName)
					.find({
						city: {
							$regex: `.*${city}.*`, 
							$options: 'i' 
						}
					})
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

	if ('city' in form)
		result.city = form.city;

	if ('loc' in form) {
		if (Array.isArray(form.loc))
			result.loc = form.loc.map(v => parseFloat(v))
		else if (typeof form.loc === 'string')
			result.loc = form.loc.split(',').map(v => parseFloat(v));
	}

	if ('pop' in form)
		result.pop = parseInt(form.pop)

	if ('state' in form)
		result.state = form.state.toUpperCase()

	return (result)
}

module.exports = (config) => {
	return (new f(config))
}
