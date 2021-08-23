import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as route53 from "@aws-cdk/aws-route53";

export interface ReactjsS3StackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneName: string;
  hostedZoneId: string;
}

export class ReactjsS3Stack extends cdk.Stack {
  /*
  Deploy ReactJS project using S3
  */
  output: cdk.CfnOutput;

  constructor(scope: cdk.Construct, id: string, props: ReactjsS3StackProps) {
    super(scope, id, props);

    // Create S3 Bucket
    const bucket = new s3.Bucket(this, "ReactAppBucket", {
      bucketName: props.domainName,
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: "index.html",
      // websiteErrorDocument: "index.html",
    });
    // const bucket = s3.Bucket.fromBucketName(
    //   this,
    //   "ReactAppBucket",
    //   props.domainName
    // );

    const zone = route53.PublicHostedZone.fromHostedZoneAttributes(
      this,
      "HostedZone",
      {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.hostedZoneName,
      }
    );

    const cname = new route53.CnameRecord(this, "cname", {
      zone: zone,
      recordName: props.domainName,
      domainName: bucket.bucketWebsiteDomainName,
    });

    this.output = new cdk.CfnOutput(this, "DomainName", {
      value: cname.domainName,
    });
  }
}
