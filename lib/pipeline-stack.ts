import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import * as cdk from "@aws-cdk/core";
import * as pipelines from "@aws-cdk/pipelines";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as s3 from "@aws-cdk/aws-s3";
import { WebsiteStage } from "./website-stage";

require("dotenv").config();

export class PipelineStack extends cdk.Stack {
  public readonly pipeline: pipelines.CdkPipeline;
  readonly domainName = process.env.DOMAIN_NAME!;
  readonly hostedZoneName = process.env.HOSTED_ZONE_NAME!;
  readonly hostedZoneId = process.env.HOSTED_ZONE_ID!;

  readonly name: string;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.name = id;

    const sourceArtifact = new codepipeline.Artifact();
    const buildArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    // Generates the source artifact from the repo we created in the last step
    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: "GitHub",
      output: sourceArtifact,
      oauthToken: cdk.SecretValue.secretsManager("GITHUB_MARKQJ"),
      owner: "qinjie",
      repo: "poc-profile-fetcher-ui",
      branch: "master",
      // branch: "add-cdk-for-cicd",
    });

    // Builds our source code outlined above into a could assembly artifact
    const synthAction = pipelines.SimpleSynthAction.standardNpmSynth({
      sourceArtifact: sourceArtifact,
      cloudAssemblyArtifact,
      installCommand: "npm install --include=dev",
      buildCommand: "npm run build",
      environment: {
        privileged: true,
      },
    });

    this.pipeline = new pipelines.CdkPipeline(this, "Pipeline", {
      // Disable Customer Master Keys for same account deployment
      crossAccountKeys: false,
      // Other setups
      pipelineName: id,
      cloudAssemblyArtifact,
      sourceAction,
      synthAction,
      /* Diable mutating when developing pipeline only */
      // selfMutating: false,
    });

    /* Add website Stage to create web stack */
    const websiteStage = this.pipeline.addApplicationStage(
      new WebsiteStage(this, `${id}WebStage`, {
        domainName: this.domainName,
        hostedZoneName: this.hostedZoneName,
        hostedZoneId: this.hostedZoneId,
        ...props,
      })
    );

    /* Add a stage to build and deploy website */
    const buildDeployStage = this.pipeline.addStage(
      `${id}WebsiteBuildAndDeployStage`
    );

    buildDeployStage.addActions(
      this.buildAction(
        sourceArtifact,
        buildArtifact,
        buildDeployStage.nextSequentialRunOrder()
      ),
      this.deployAction(
        buildArtifact,
        this.domainName,
        buildDeployStage.nextSequentialRunOrder()
      )
    );
  }

  private buildAction(
    sourceArtifact: codepipeline.Artifact,
    buildArtifact: codepipeline.Artifact,
    runOrder: number
  ): codepipeline_actions.CodeBuildAction {
    return new codepipeline_actions.CodeBuildAction({
      actionName: "Build",
      runOrder: runOrder,
      input: sourceArtifact,
      outputs: [buildArtifact],
      project: new codebuild.PipelineProject(
        this,
        `${this.name}WebsiteBuildProject`,
        {
          projectName: `${this.name}WebsiteBuildProject`,
          buildSpec: codebuild.BuildSpec.fromSourceFilename(
            "frontend/buildspec.yml"
          ),
          // buildSpec: codebuild.BuildSpec.fromObject({
          //   version: "0.2",
          //   phases: {
          //     install: {
          //       commands: ["cd frontend", "npm install"],
          //     },
          //     build: {
          //       commands: ["npm run build"],
          //     },
          //   },
          //   artifacts: {
          //     "base-directory": "frontend/build",
          //     files: "**/*",
          //   },
          // }),
          environment: {
            buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            computeType: codebuild.ComputeType.SMALL,
          },
        }
      ),
    });
  }

  private deployAction(
    input: codepipeline.Artifact,
    bucketName: string,
    runOrder: number
  ): codepipeline_actions.S3DeployAction {
    const bucket = s3.Bucket.fromBucketName(
      this,
      `${this.name}WebsiteBucket`,
      bucketName
    );

    return new codepipeline_actions.S3DeployAction({
      actionName: "Deploy",
      runOrder: runOrder,
      input: input,
      bucket: bucket,
    });
  }
}
