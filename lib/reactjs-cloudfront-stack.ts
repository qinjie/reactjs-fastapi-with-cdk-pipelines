import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53_target from "@aws-cdk/aws-route53-targets";
import * as cert_manager from "@aws-cdk/aws-certificatemanager";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as iam from "@aws-cdk/aws-iam";

export interface ReactjsCloudfrontStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneName: string;
  hostedZoneId: string;
}

export class ReactjsCloudfrontStack extends cdk.Stack {
  /*
  Deploy ReactJS project using CloudFront
  */
  output: cdk.CfnOutput;

  constructor(
    scope: cdk.Construct,
    id: string,
    props: ReactjsCloudfrontStackProps
  ) {
    super(scope, id, props);

    // Create S3 Bucket
    const bucket = new s3.Bucket(this, "ReactAppBucket", {
      bucketName: props.domainName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // websiteIndexDocument: "index.html",
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

    const certificate = new cert_manager.DnsValidatedCertificate(
      this,
      "WebsiteCert",
      {
        domainName: props.domainName,
        hostedZone: zone,
        // Certification must be in us-east-1 region regardless your app deployment region
        region: "us-east-1",
      }
    );

    /* Cloudfront */
    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, "OAI", {
      comment: "OAI for ReactApp",
    });
    cloudfrontOAI.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const cloudfrontS3Access = new iam.PolicyStatement();
    cloudfrontS3Access.addActions("s3:GetBucket*");
    cloudfrontS3Access.addActions("s3:GetObject*");
    cloudfrontS3Access.addActions("s3:List*");
    cloudfrontS3Access.addResources(bucket.bucketArn);
    cloudfrontS3Access.addResources(`${bucket.bucketArn}/*`);
    cloudfrontS3Access.addCanonicalUserPrincipal(
      cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
    );

    bucket.addToResourcePolicy(cloudfrontS3Access);
    bucket.grantRead(cloudfrontOAI);

    // const distribution = new cloudfront.Distribution(
    //   this,
    //   "WebsiteDistribution",
    //   {
    //     domainNames: [props.domainName],
    //     certificate: certificate,
    //     defaultRootObject: "index.html",
    //     defaultBehavior: {
    //       origin: new cloudfront_origin.S3Origin(bucket, {
    //         originAccessIdentity: oai,
    //       }),
    //       viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    //     },
    //   }
    // );

    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "Cloudfront",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: bucket,
              originAccessIdentity: cloudfrontOAI,
            },
            behaviors: [{ isDefaultBehavior: true }],
          },
        ],
        errorConfigurations: [
          {
            errorCode: 404,
            responseCode: 200,
            responsePagePath: "/index.html",
            errorCachingMinTtl: 300,
          },
          {
            errorCode: 403,
            responseCode: 200,
            responsePagePath: "/index.html",
            errorCachingMinTtl: 300,
          },
        ],
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        aliasConfiguration: {
          acmCertRef: certificate.certificateArn,
          names: [props.domainName],
        },
      }
    );
    distribution.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const arecord = new route53.ARecord(this, "AliasRecrod", {
      zone,
      recordName: props.domainName,
      target: route53.RecordTarget.fromAlias(
        new route53_target.CloudFrontTarget(distribution)
      ),
    });
    arecord.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // CloudFormation Output
    this.output = new cdk.CfnOutput(this, "CloudFrontDomainName", {
      value: distribution.distributionDomainName,
    });
  }
}
