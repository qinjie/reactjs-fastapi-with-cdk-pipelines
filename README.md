# POC Web Portal




## 1. Initial Project Structure

### Prerequisite

Install and configure following tools on your computer.
- Installed NodeJS (LTS or higher) and npm / yarn
- Installed Typescript (3)
- Installed AWS CLI (1.16 or higher)
- Installed CDK CLI ( npm i -g cdk )
- Configured AWS Account ( aws configure )




### CDK Project

Initialize a blank CDK project.

```
cdk init app --language typescript
```
Folder structure with key files/folders in a CDK project.

```
├── README.md
├── bin
├── cdk.json
├── lib
├── package-lock.json
├── package.json
```

Add following line in `cdk.json`.

```
context"@aws-cdk/core:newStyleStackSynthesis": true
```

Run following command to bootstrap cdk.

```
cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

Install  libraries from CDK

```bash
npm install @aws-cdk/core @aws-cdk/aws-s3 @aws-cdk/aws-cloudfront @aws-cdk/aws-iam @aws-cdk/aws-codebuild @aws-cdk/aws-codepipeline @aws-cdk/aws-codepipeline-actions @aws-cdk/aws-route53 @aws-cdk/aws-route53-targets @aws-cdk/aws-certificatemanager @aws-cdk/pipelines @aws-cdk/aws-s3-deployment 
```

Install other libraries

```
npm install dotenv
```



### ReactJS Project

Create a React App using `create-react-app` in `frontend` folder.
```
npx create-react-app frontend
```



## 2. Stacks

This project provides 2 main type of web deployment stack. 

#### `reactjs-s3-stack.ts` 

* Create an S3 bucket and configure it for web hosting
* Deploy the website to the bucket
* It can only provide HTTP service

#### `reactjs-cloudfront-stack.ts`

* Create an S3 bucket as staging area
* Create a CloudFront distribution using the staging S3 bucket
* Assign a certificate to the CloudFront distribution such that it can provide HTTPS service



## 3. Deployment

### Create Code Pipeline

Run `cdk deploy` to create the code pipeline first. It will create all resources, build and deploy code from repo. 

Subsequent code commit into the repo will trigger the pipeline to self-mutate and redeploy code.



### Destroy Code Pipeline

To destroy the pipeline, destroy all sub-stacks first before running `cdk destroy`. If not, sub-stacks will not be removed and they need to manually remove sub-stack from AWS console. 





## 4. Others

### Manual Creation a New S3 Bucket for Website (Reference)

Following are the steps if there is a need to create an S3 bucket for website hosting. 

In `helper` folder, it contains 2 files `s3-web-policy.json` and `route53-change-cname.json`.

In `s3-web-policy.json` file, replace the `DOMAIN-NAME-HERE`with actual domain name.

```json
{
    "Version": "2008-10-17",
    "Id": "PolicyForPublicWebsiteContent",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": {
                "AWS": "*"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::DOMAIN-NAME-HERE/*"
        }
    ]
}
```

In `route53-change-cname.json` file, replace `DOMAIN-NAME-HERE` and `S3-BUCKET-WEB-URL-HERE` with actual value.

```json
{
    "Comment": "Updates CNAME to a specified value",
    "Changes": [
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "DOMAIN-NAME-HERE",
                "Type": "CNAME",
                "TTL": 30,
                "ResourceRecords": [
                    {
                        "Value": "S3-BUCKET-WEB-URL-HERE"
                    }
                ]
            }
        }
    ]
}
```



In following commands, replace `DOMAIN-NAME-HERE` and `HOST-ZONE-ID-HERE` with actual values. Run the commands to configure an S3 bucket as web host. It also configure route53 to point to the s3 bucket.

```bash
cd helper
aws s3api create-bucket --bucket DOMAIN-NAME-HERE --region ap-southeast-1 --create-bucket-configuration LocationConstraint=ap-southeast-1
aws s3 website s3://DOMAIN-NAME-HERE --index-document index.html --error-document error.html
aws s3api put-bucket-policy --bucket DOMAIN-NAME-HERE --policy file://./s3-web-policy.json
aws route53 change-resource-record-sets --hosted-zone-id HOST-ZONE-ID-HERE --change-batch file://./route53-change-cname.json
```



For example, if DOMAIN-NAME-HERE is `dart.peidu.sg`,

```
cd helper
aws s3api create-bucket --bucket dart.peidu.sg --region ap-southeast-1 --create-bucket-configuration LocationConstraint=ap-southeast-1
aws s3 website s3://dart.peidu.sg --index-document index.html --error-document error.html
aws s3api put-bucket-policy --bucket dart.peidu.sg --policy file://./s3-web-policy.json
aws route53 change-resource-record-sets --hosted-zone-id HOST-ZONE-ID-HERE --change-batch file://./route53-change-cname.json
```



### Reference

- https://superluminar.io/2020/12/04/static-websites-with-aws-cdk/



