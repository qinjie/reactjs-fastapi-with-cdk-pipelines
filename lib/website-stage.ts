import * as cdk from "@aws-cdk/core";
import { ReactjsS3Stack } from "./reactjs-s3-stack";
import { ReactjsCloudfrontStack } from "./reactjs-cloudfront-stack";

export interface WebsiteStageProps extends cdk.StageProps {
  domainName: string;
  hostedZoneName: string;
  hostedZoneId: string;
}

export class WebsiteStage extends cdk.Stage {
  public readonly output: cdk.CfnOutput;

  constructor(scope: cdk.Construct, id: string, props: WebsiteStageProps) {
    super(scope, id, props);

    // const stack = new ReactjsS3Stack(this, "Reactjs", props);
    const stack = new ReactjsCloudfrontStack(this, "Reactjs", props);
    this.output = stack.output;
  }
}
