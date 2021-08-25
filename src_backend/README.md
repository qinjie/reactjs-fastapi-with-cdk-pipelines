# NanoID Generator

Nano ID is a library for generating random IDs. Likewise UUID, there is a probability of duplicate IDs. However, this probability is extremely small.
It uses [py-nanoid](https://github.com/puyuan/py-nanoid) library.

## Test Backend

In src_backend folder, run the api in local server

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Use API Tester or run following command to test

```bash
curl http://127.0.0.1:8000/v1/nanoid/3
curl -X POST http://127.0.0.1:8000/v1/nanoid/3 -H "Content-Type: application/json" -d "{\"alphabets\": \"1234567890abcdef\", \"length\": 20}"
```

## Deploy to AWS

Use CDK to provision the cloud infrastructure and deploy lambda function.

- It will first create a CloudFormation stack
- Above stack creates/updates a codepipeline
- Execution of codepipeline creates another CloudFormations tack
- Child stack provision infra for the lambda function

```
cdk deploy
```

Once pipeline is setup, any new commits into the specified branch of the repo will cause the pipeline to self mutate first, before it runs the pipeline again to update the lambda function.

### To Test

In the CloudFormation stack for lambda function, check its output to find the API Gateway URL.

Visit site `<API-GATEWAY-URL>/docs` to view the API documenation page.

### To Destroy

First find out names of all stacks.

```
cdk list
```

Delete all stacks in one command by listing all stack names.

```
cdk destroy <STACK1> <STACK2>
```
