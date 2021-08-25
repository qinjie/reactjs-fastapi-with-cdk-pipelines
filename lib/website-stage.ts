import * as cdk from "@aws-cdk/core";
import { ReactjsS3Stack } from "./website-s3-stack";
import { WebsiteCloudfrontStack } from "./website-cloudfront-stack";
import { LambdaApiStack } from "./backend-stack";

export interface WebsiteStageProps extends cdk.StageProps {
  domainName: string;
  hostedZoneName: string;
  hostedZoneId: string;
}

export class WebsiteStage extends cdk.Stage {
  public readonly outputLambda: cdk.CfnOutput;
  public readonly outputApiGateway: cdk.CfnOutput;
  public readonly outputWebsite: cdk.CfnOutput;

  constructor(scope: cdk.Construct, id: string, props: WebsiteStageProps) {
    super(scope, id, props);

    const stackBackend = new LambdaApiStack(this, `${id}Backend`, {
      tags: {
        Application: `${id}Backend`,
        Environment: id,
      },
    });
    this.outputLambda = stackBackend.outputLambda;
    this.outputApiGateway = stackBackend.outputApiGateway;

    // const stack = new ReactjsS3Stack(this, `${id}Frontend`, props);
    const stackFrontend = new WebsiteCloudfrontStack(this, `${id}Frontend`, {
      ...props,
    });
    this.outputWebsite = stackFrontend.output;
  }
}
