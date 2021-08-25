import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambda_python from "@aws-cdk/aws-lambda-python";
import * as path from "path";
import * as dotenv from "dotenv";
import { Construct } from "@aws-cdk/core";
import { IFunction } from "@aws-cdk/aws-lambda";
import { CorsHttpMethod, HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";

export class LambdaApiStack extends cdk.Stack {
  outputLambda: cdk.CfnOutput;
  outputApiGateway: cdk.CfnOutput;
  lambdaFunction: IFunction;

  // Update Lambda Function Definition here
  /* TO BE UPDATED - START */
  lambda_src_folder = process.env.BACKEND_PATH!;
  name: string;

  private getLambdaFunction(
    scope: Construct,
    env_values: { [key: string]: string } | undefined
  ): IFunction {
    const props = {
      entry: path.join(__dirname, this.lambda_src_folder),
      index: "app/main.py",
      handler: "handler",
      runtime: lambda.Runtime.PYTHON_3_8,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      environment: env_values,
    };

    const f = new lambda_python.PythonFunction(scope, this.name, props);
    return f;
  }
  /* TO BE UPDATED - END */

  // Load .env into dictionary for lambda function
  private loadEnv() {
    const env = dotenv.config({
      path: path.join(__dirname, this.lambda_src_folder, ".env"),
    });
    if (env.error) {
      throw env.error;
    }
    const env_values = {
      ...env.parsed,
    };
    return env_values;
  }

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const env_values = this.loadEnv();
    this.name = id;

    /* Create lambda function */
    this.lambdaFunction = this.getLambdaFunction(this, env_values);

    /* Create APIGateway */
    const httpApi = new HttpApi(this, `${id}Api`, {
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [CorsHttpMethod.ANY],
        allowHeaders: ["*"],
      },
      apiName: `${id}Api`,
      defaultIntegration: new LambdaProxyIntegration({
        handler: this.lambdaFunction,
      }),
    });

    /* Integrate APIGateway with Lambda */
    const lambdaIntegration = new LambdaProxyIntegration({
      handler: this.lambdaFunction,
    });

    httpApi.addRoutes({
      integration: lambdaIntegration,
      path: "/{proxy+}",
      methods: [HttpMethod.ANY],
    });

    /* CloudFormation Output */
    this.outputLambda = new cdk.CfnOutput(this, `${this.name}_FunctionName`, {
      value: this.lambdaFunction.functionName,
    });

    this.outputApiGateway = new cdk.CfnOutput(this, `${id}ApiUrl`, {
      value: httpApi.url!,
      exportName: `${id}ApiUrlExport`,
    });
  }
}
