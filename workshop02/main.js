const range = require('express-range')
const compression = require('compression')

const express = require('express')

const RestaurantDB = require('./restaurantdb');
const CitiesDB = require('./citiesdb');

//Load application keys
//Rename _keys.json file to keys.json
const keys = require('./keys.json')

console.info(`Using ${keys.mongo}`);

const db = RestaurantDB({  
	connectionUrl: keys.mongo, 
	databaseName: 'lifestyle', 
	collectionName: 'restaurant'
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Start of workshop

// Mandatory workshop
// TODO GET /api/cities
app.get('/api/cities', (req, resp) => {

	resp.type('application/json')

	db.findAllCities()
		.then(result => {
			resp.status(200).json(result)
		})
		.catch(error => {
			resp.status(400).json({ error: error });
		})
})

// TODO GET /api/restaurants/:city
app.get('/api/restaurants/:city', 
	range({ accept: 'items', limit: 20 }),
	compression(),
	(req, resp) => {

		console.info('in get')

		const offset = req.range.first;
		const limit = (req.range.last - req.range.first) + 1

		resp.type('application/json')

		Promise.all([ 
				db.findRestaurantByCity(req.params.city, { offset: offset, limit: limit }),
				db.countRestaurantsInCity(req.params.city) ])
			.then(result => {
				resp.status(206)
				resp.set('Accept-Ranges', 'items')
				resp.range({
					first: req.range.first,
					last: req.range.last,
					length: result[1]
				})
				resp.json(result[0].map(v => `/api/restaurant/${v}`))
			})
			.catch(error => {
				resp.status(400).json({ error: error });
			})
	}
);

// TODO GET /api/restaurant/:restId
app.get('/api/restaurant/:restId', (req, resp) => {

	resp.type('application/json')

	db.findRestaurantById(req.params.restId)
		.then(result => {
			if (result.length > 0) 
				return resp.status(200).json(result[0])
			resp.status(404).json({ error: `City '${req.params.restId}' not found` })
		})
		.catch(error => {
			resp.status(400).type('application/json').json({ error: error });
		})
})

// TODO POST /api/restaurant
app.post('/api/restaurant', (req, resp) => {

	const params = {
		URL: req.body.url,
		address: req.body.address,
		"address line 2": req.body.city,
		name: req.body.name,
		outcode: req.body.outcode,
		postcode: req.body.postcode,
		rating: parseInt(req.body.rating) || 'Not yet rated',
		type_of_food: req.body.type_of_food
	}

	resp.type('application/json')

	db.insertRestaurant(params)
		.then(result => {
			resp.status(201).json(result)
		})
		.catch(error => {
			console.error(error);
			resp.status(400).json({ error: error });
		})
});

// Optional workshop
// TODO HEAD /api/restaurants/:city
// Must be placed before GET, otherwise GET will process
// the request
app.head('/api/restaurants/:city', (req, resp) => {
	resp.type('application/json')
		.set('Accept-Ranges', 'items')
		.set('Accept-Encoding', 'gzip')
		.end()
})

// TODO GET /state/:state/count
app.get('/api/state/:state/count', (req, resp) => {

	resp.type('application/json')

	db.countCitiesInState(req.params.state)
		.then(result => {
			resp.status(200)
				.json({
					state: req.params.state.toUpperCase(),
					cities: result
				})
		})
		.catch(error => {
			resp.status(400).json({ error: error });
		})
})

// TODO GET /city/:name
app.get('/api/city/:name', (req, resp) => {

	resp.type('application/json')

	db.findCitiesByName(req.params.cityId)
		.then(result => {
			resp.status(200)
				.json(result)
		})
		.catch(error => {
			resp.status(400).json({ error: error });
		})
})


// End of workshop

db.getDB()
	.then((db) => {
		const PORT = parseInt(process.argv[2] || process.env.APP_PORT) || 3000;

		console.info('Connected to MongoDB. Starting application');
		app.listen(PORT, () => {
			console.info(`Application started on port ${PORT} at ${new Date()}`);
		});
	})
	.catch(error => {
		console.error('Cannot connect to mongo: ', error);
		process.exit(1);
	});
