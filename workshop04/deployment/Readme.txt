Build the docker image
	docker build -t <your_dockerhub_name>/api_zips:v1 

Push image 
	docker login
	docker push <your_dockerhub_name>/api_zips:v1 

Deployment
	Create a network
		docker network create mynet

	Run api_zips
		# Note: not port binding the container. Will use nginx to provide access 
		# name must be zips because that is the name that nginx will forward to
		docker run -d --network mynet --name zips <your_dockerhub_name>/api_zips:v1 

	Run nginx
		# Note: must be in the same network as the above
		docker run -d --network mynet --name nginx \
			-v /path/to/this/directory/nginx.conf:/etc/nginx/nginx.conf \
			-p 8080:80 nginx:latest

	Verify that container is running
		docker ps 

	Test
		curl http://localhost:8080/api/states
	
