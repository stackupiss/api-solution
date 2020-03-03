const { join } = require('path');

const cacheControl = require('express-cache-controller')
const preconditions = require('express-preconditions')
const cors = require('cors');
const range = require('express-range')
const compression = require('compression')

const { Validator, ValidationError } = require('express-json-validator-middleware')
const  OpenAPIValidator  = require('express-openapi-validator').OpenApiValidator;

const schemaValidator = new Validator({ allErrors: true, verbose: true });

const express = require('express')

const CitiesDB = require('./citiesdb');

//Load application keys
//Rename _keys.json file to keys.json
const keys = require('./keys.json')

// TODO change your databaseName and collectioName 
// if they are not the defaults below
const db = CitiesDB({  
	connectionUrl: keys.mongo, 
	databaseName: 'zips', 
	collectionName: 'city'
});

const app = express();

//Disable etag for this workshop
app.set('etag', false);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start of workshop

// TODO 1/2 Load schemans

const citySchema = require('./schema/city-schema.json');

new OpenAPIValidator({ 
    apiSpec: join(__dirname, 'schema', 'city-api.yaml')
}).install(app)
.then(() => {
	// TODO 2/2 Copy your routes from workshop03 here

	// TODO GET /api/states
	app.get('/api/states', 
		cacheControl({ maxAge: 30, private: false }),
		(req, resp) => {
			  resp.type('application/json')

			  db.findAllStates()
					.then(result => {
						 resp.status(200).json(result)
					})
					.catch(error => {
						 resp.status(400).json({ error: error });
					})
		 }
	)

	// TODO GET /api/state/:state

	// etag that returns tags as <state abbrevation><number of cities in state>
	// ignoring the Range header
	const precondOptions = {
		 stateAsync: (req) => 
			  db.countCitiesInState(req.params.state)
					.then(result => {
						 const state = req.params.state.toLowerCase()
						 return ({
							  etag: `"${state}${result}"`,
							  //lastModified: "last_modified_date"
						 })
					})
	}

	app.get('/api/state/:state', 
		 //Ignore the Range header
		preconditions(precondOptions),
		range({ accept: 'items', limit: 20 }),
		compression(),
		(req, resp) => {

			const offset = req.range.first;
			const limit = (req.range.last - req.range.first) + 1
			const state = req.params.state;

			resp.type('application/json')

			Promise.all([ 
					db.findCitiesByName(state, { offset: offset, limit: limit }),
					db.countCitiesInState(state) ])
				.then(results => {
					resp.status(206)
						 resp.set('Accept-Ranges', 'items')
						 resp.set('ETag', `"${state.toLowerCase()}${results[1]}"`)
					resp.range({
						first: req.range.first,
						last: req.range.last,
						length: results[1]
					})
					resp.json(results[0])
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
	app.post('/api/city', 
		// Convert forms to json
		/*
		(req, resp, next) => {
			switch (req.header('content-type')) {
				case 'application/x-www-form-urlencoded':
					req.jsonPayload = citiesdb.form2json(req.body);
					break;
				case 'application/json':
					req.jsonPayload = req.body;
					break;

				default:
					req.jsonPayload = {}
			}
			next()
		},
		*/
		// Only validate application/json payload
		// If you're using OAS3 then you do not need to validate
		// the schema as you should have the payload's schema 
		// in your OAS3
		//schemaValidator.validate({ jsonPayload: citySchema }), 
		(req, resp) => {
		
		// No longer need to perform checks. Handle by either 
		// JSON schema or OAS3
		// Perform a simple check
		// if (!citiesdb.validateForm(req.body))
		//		return resp.status(400).json({ error: 'Incomplete parameters' })

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

	app.get('/health', (req, resp) => {
		console.info(`health check: ${new Date()}`)
		resp.status(200)
			.type('application/json')
			.json({ time: (new Date()).toGMTString() })
	})

	app.use('/schema', express.static(join(__dirname, 'schema')));

	app.use((error, req, resp, next) => {

		if (error instanceof ValidationError) {
			console.error('Schema validation error: ', error)
			return resp.status(400).type('application/json').json({ error: error });
		}

		else if (error.status) {
			console.error('OpenAPI specification error: ', error)
			return resp.status(400).type('application/json').json({ error: error });
		}

		console.error('Error: ', error);
		resp.status(400).type('application/json').json({ error: error });
	});

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

})


