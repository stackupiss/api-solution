const { join } = require('path');
const fs = require('fs');
const uuid = require('uuid/v1')

const cacheControl = require('express-cache-controller')
const preconditions = require('express-preconditions')
const cors = require('cors');
const range = require('express-range')
const compression = require('compression')

const { Validator, ValidationError } = require('express-json-validator-middleware')
const  OpenAPIValidator  = require('express-openapi-validator').OpenApiValidator;

const schemaValidator = new Validator({ allErrors: true, verbose: true });

const consul = require('consul')({ promisify: true });

const express = require('express')

const CitiesDB = require('./citiesdb');

const serviceId = uuid().substring(0, 8);
const serviceName = `zips`

//Load application keys
//Rename _keys.json file to keys.json
const keys = require('./keys.json')

console.info(`Using ${keys.mongo}`);

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

// TODO 1/3 Load schemans

const citySchema = require('./schema/city-schema.json');

new OpenAPIValidator({ 
    apiSpecPath: join(__dirname, 'schema', 'city-api.yaml')
}).install(app)


// TODO 2/3 Copy your routes from workshop03 here

// TODO GET /api/states
const precondOptions = {
	stateAsync: (req) => 
		new Promise((resolve, reject) => {
			// Returns either the last modified date of the resource
			// or the latest ETag
			resolve('"SomeETag"')
		})
}

app.get('/api/states', 
	cacheControl({ maxAge: 30, private: false }),
	preconditions(precondOptions),
	(req, resp) => {

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
			console.info(`\tService id: ${serviceId}`);

			// TODO 3/3 Add service registration here
			console.info(`Registering service ${serviceName}:${serviceId}`)
			consul.agent.service.register({
				id: serviceId,
				name: serviceName,
				port: PORT,
				check: {
					ttl: '10s',
					deregistercriticalserviceafter: '30s'
				}
			}).then(() => {
				setInterval(
					() => {
						consul.agent.check.pass({ id: `service:${serviceId}` })
					}, 10000 //10s
				)
				process.on('SIGINT', () => {
					console.info(`Deregistering service ${serviceName}:${serviceId}`)
					consul.agent.service.deregister({ id: serviceId })
						.finally(() => process.exit())
				})
			}).catch(error => console.error('Error: ', error))

		});
	})
	.catch(error => {
		console.error('Cannot connect to mongo: ', error);
		process.exit(1);
	});
