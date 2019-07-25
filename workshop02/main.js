const range = require('express-range')
const compression = require('compression')

const express = require('express')

const CitiesDB = require('./citiesdb');

//Load application keys
//Rename _keys.json file to keys.json
const keys = require('./keys.json')

console.info(`Using ${keys.mongo}`);

const db = CitiesDB({  
	connectionUrl: keys.mongo, 
	databaseName: 'zips', 
	collectionName: 'city'
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start of workshop

// Mandatory workshop
// TODO GET /api/states
app.get('/api/states', (req, resp) => {

	resp.type('application/json')

	db.findAllStates()
		.then(result => {
			resp.status(200).json(result)
		})
		.catch(error => {
			resp.status(400).json({ error: error });
		})
})


// TODO GET /api/state/:state
app.get('/api/state/:state', 
	range({ accept: 'items', limit: 20 }),
	compression(),
	(req, resp) => {

		const offset = req.range.first;
		const limit = (req.range.last - req.range.first) + 1

		resp.type('application/json')

		Promise.all([ 
				db.findCitiesByName(req.params.state, { offset: offset, limit: limit }),
				db.countCitiesInState(req.params.state) ])
			.then(result => {
				resp.status(206)
				resp.set('Accept-Ranges', 'items')
				resp.range({
					first: req.range.first,
					last: req.range.last,
					length: result[1]
				})
				resp.json(result[0])
			})
			.catch(error => {
				resp.status(400).json({ error: error });
			})
	}
);


// TODO GET /api/city/:cityId
app.get('/api/city/:cityId', (req, resp) => {

	resp.type('application/json')

	db.findCityById(req.params.cityId)
		.then(result => {
			if (result.length > 0) 
				return resp.status(200).json(result)
			resp.status(404).json({ error: `City '${req.params.cityId}' not found` })
		})
		.catch(error => {
			resp.status(400).type('application/json').json({ error: error });
		})
})


// TODO POST /api/city
app.post('/api/city', (req, resp) => {

	// Perform a simple check
	if (!citiesdb.validateForm(req.body))
		return resp.status(400).json({ error: 'Incomplete parameters' })

	const params = {
		city: req.body.city,
		loc: req.body.loc.map(v => parseFloat(v)),
		pop: parseInt(req.body.pop),
		state: req.body.state
	}

	resp.type('application/json')

	db.insertCity(params)
		.then(result => {
			resp.status(201).json(result.ops[0])
		})
		.catch(error => {
			console.error(error);
			resp.status(400).json({ error: error });
		})
});

// Optional workshop
// TODO HEAD /api/state/:state
// IMPORTANT: HEAD must be place before GET for the
// same resource. Otherwise the GET handler will be invoked
app.head('/api/state/:state', (req, resp) => {
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
