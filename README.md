# ReactJS and FastAPI with CDK Pipelines

This project aims to deploy a full stack of web application using CDK Pipelines.

- The website is a dummy website generated using `create-react-app` with typescript template.
- The API is implemented using FastAPI and deployed to AWS Lambda.

## Status

It is able to deploy both frontend website to CloudFront and backend API to Lambda.

## TODO

After deployment of backend API, need to find a way to pass API URL to frontend ReactJS website. E.g. using CloudFormation import/export value, and set it as an environment variable.
