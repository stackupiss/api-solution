const range = require('express-range')
const compression = require('compression')

const express = require('express')

const data = require('./zips')
const CitiesDB = require('./zipsdb')

//Load application keys
const db = CitiesDB(data);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start of workshop

// Mandatory workshop
// TODO GET /api/states
app.get('/api/states', (req, resp) => {

	resp.type('application/json')

	const result = db.findAllStates()
	resp.status(200).json(result)
})


// TODO GET /api/state/:state
app.get('/api/state/:state', 
	range({ accept: 'items', limit: 20 }),
	compression(),
	(req, resp) => {

		const offset = req.range.first;
		const limit = (req.range.last - req.range.first) + 1

		resp.type('application/json')

		const cityNames = db.findCitiesByState(req.params.state, { offset: offset, limit: limit })
		const cityCount = db.countCitiesInState(req.params.state) 

		resp.status(206)
		resp.set('Accept-Ranges', 'items')
		resp.range({
			first: req.range.first,
			last: req.range.last,
			length: cityCount
		})
		resp.json(cityNames)
	}
);


// TODO GET /api/city/:cityId
app.get('/api/city/:cityId', (req, resp) => {

	resp.type('application/json')

	const result = db.findCityById(req.params.cityId);

	if (!!result)
		return resp.status(200).json(result)

	resp.status(404).json({ error: `City '${req.params.cityId}' not found` })
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

	resp.status(201).json({ message: 'Added' })
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

	const count = db.countCitiesInState(req.params.state)
	resp.status(200)
		.json({
			state: req.params.state.toUpperCase(),
			cities: count
		})
})

// TODO GET /api/city/:name
app.get('/api/city/:name', (req, resp) => {

	resp.type('application/json')

	console.info('in here')

	const result = db.findCitiesByName(req.params.name)
	resp.status(200).json(result)
})

// End of workshop

const PORT = parseInt(process.argv[2] || process.env.APP_PORT) || 3000;
app.listen(PORT, () => {
	console.info(`Application started on port ${PORT} at ${new Date()}`);
});

