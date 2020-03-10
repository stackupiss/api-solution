# Generating clients or server with openapi-generator

## Install openapi-generator
	[https://openapi-generator.tech/docs/installation](https://openapi-generator.tech/docs/installation)
	Linux, OSX

		```bash
		sudo npm install @openapitools/openapi-generator-cli -g
		```

	Windows

		```bash
		npm install @openapitools/openapi-generator-cli -g
		```

## Generate Python
	See client/server generators
		[https://openapi-generator.tech/docs/generators](https://openapi-generator.tech/docs/generators)

	```bash
	openapi-generator -i api.yaml -g python
	```

	Setup
		```bash
		virtualenv -p /usr/bin/python3 venv
		source venv/bin/activate

		pip install -r requirements.txt

		python setup.py install --user
		```

		```python
		import openapi_client
		frm openapi_client.rest import ApiException

		client = openapi_client.DefaultApi()
		try:
			result = client.get_states()
		except ApiException as e:
			print('exception: ', e)
		```
