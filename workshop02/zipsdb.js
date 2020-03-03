const uuidv1 = require('uuid/v1')

// { "_id" : "01001", "city" : "AGAWAM", "loc" : [ -72.622739, 42.070206 ], "pop" : 15338, "state" : "MA" },
const f = function(data) {
	this.data = data
}

f.prototype.findCitiesByState = function(state, params = {}) {
	const s = state.toLowerCase()
	const limit = parseInt(params['limit']) || 10;
	const offset = parseInt(params['offset']) || 0;
	const result = this.data.filter(v => v['state'].toLowerCase() == s)
	return (result.slice(offset, offset + limit))
}

f.prototype.countCitiesInState = function(state) {
	return (this.findCitiesByState(state, { limit: this.data.length }).length)
}

f.prototype.findCityById = function(id) {
	for (city of this.data) {
		if (id == city['_id'])
			return city
	}
	return (null)
}

f.prototype.findCitiesByName = function(city) {
	const c = city.toLowerCase()
	return (this.data.filter(v => c == v['city'].toLowerCase()))
}

f.prototype.findAllStates = function() {
	const reducer = (acc, val) => {
		if (!(val["state"] in acc))
			acc[val["state"]] = ""
		return (acc)
	}
	return (Object.keys(this.data.reduce(reducer, {})))
}

f.prototype.insertCity = function(params) {
	params._id = uuidv1().substring(0, 8);
	this.data.push(params)
}

f.prototype.MANDATORY_FIELDS = [ 'city', 'loc', 'pop', 'state' ]
f.prototype.validateForm = function(form) {
	for (let f of this.MANDATORY_FIELDS)
		if (!(f in form))
			return (false);
	return (true)
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

module.exports = function(data) {
	return (new f(data))
}
