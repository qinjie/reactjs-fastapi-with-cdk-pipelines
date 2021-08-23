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

  readonly repo_owner: string = process.env.REPO_OWNER!;
  readonly repo_name: string = process.env.REPO_NAME!;
  readonly repo_branch: string = process.env.REPO_BRANCH!;
  readonly secrets_manager_var: string = process.env.SECRETS_MANAGER_VAR!;

  readonly buildspec_file: string = process.env.BUILDSPEC_FILE!;

  readonly domainName = process.env.DOMAIN_NAME!;
  readonly hostedZoneName = process.env.HOSTED_ZONE_NAME!;
  readonly hostedZoneId = process.env.HOSTED_ZONE_ID!;

  readonly moduleName: string;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.moduleName = id;
    const sourceArtifact = new codepipeline.Artifact();
    const buildArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    /* Get source code from repo */
    const sourceAction = this.getGitHubSourceAction(sourceArtifact);

    /* Builds source code into a could assembly artifact */
    const synthAction = this.getNpmSynthAction(
      sourceArtifact,
      cloudAssemblyArtifact
    );

    /* Create codepipeline */
    this.pipeline = new pipelines.CdkPipeline(this, "Pipeline", {
      /* For same account deployment, Disable Customer Master Keys to save cost */
      crossAccountKeys: false,
      // Other setups
      pipelineName: this.moduleName,
      cloudAssemblyArtifact,
      sourceAction,
      synthAction,
      /* Option to diable pipeline mutation */
      // selfMutating: false,
    });

    /* Add website stack */
    const stageDev = this.pipeline.addStage("dev");
    const websiteStage = new WebsiteStage(
      this,
      `${this.moduleName}WebsiteStage`,
      {
        domainName: this.domainName,
        hostedZoneName: this.hostedZoneName,
        hostedZoneId: this.hostedZoneId,
        ...props,
      }
    );
    stageDev.addApplication(websiteStage);

    /* Add a stage to build and deploy website */
    const buildDeployStage = this.pipeline.addStage(`build-and-deploy`);

    buildDeployStage.addActions(
      this.getCodeBuildAction(
        sourceArtifact,
        buildArtifact,
        `${this.moduleName}CodeBuildProject`,
        buildDeployStage.nextSequentialRunOrder()
      ),
      this.getDeployAction(
        buildArtifact,
        this.domainName,
        `${this.moduleName}WebsiteBucket`,
        buildDeployStage.nextSequentialRunOrder()
      )
    );
  }

  private getNpmSynthAction(
    sourceArtifact: codepipeline.Artifact,
    cloudAssemblyArtifact: codepipeline.Artifact
  ): pipelines.SimpleSynthAction {
    return pipelines.SimpleSynthAction.standardNpmSynth({
      sourceArtifact,
      cloudAssemblyArtifact,
      installCommand: "npm install --include=dev",
      buildCommand: "npm run build",
      environment: {
        privileged: true,
      },
    });
  }

  private getGitHubSourceAction(
    sourceArtifact: codepipeline.Artifact
  ): codepipeline_actions.Action {
    const sourceActionProps = {
      actionName: "GitHub",
      output: sourceArtifact,
      oauthToken: cdk.SecretValue.secretsManager(this.secrets_manager_var),
      owner: this.repo_owner,
      repo: this.repo_name,
      branch: this.repo_branch,
    };

    return new codepipeline_actions.GitHubSourceAction(sourceActionProps);
  }

  private getCodeBuildAction(
    sourceArtifact: codepipeline.Artifact,
    buildArtifact: codepipeline.Artifact,
    constructId: string,
    runOrder: number
  ): codepipeline_actions.CodeBuildAction {
    return new codepipeline_actions.CodeBuildAction({
      actionName: "Build",
      runOrder: runOrder,
      input: sourceArtifact,
      outputs: [buildArtifact],
      project: new codebuild.PipelineProject(this, constructId, {
        projectName: constructId,
        /* Use buildspec.yml file in src folder */
        buildSpec: codebuild.BuildSpec.fromSourceFilename(this.buildspec_file),
        /* Use code to define buildspec instead of yml file */
        // buildSpec: codebuild.BuildSpec.fromObject({
        //   version: "0.2",
        //   phases: {
        //     install: {
        //       commands: ["cd src", "npm install"],
        //     },
        //     build: {
        //       commands: ["npm run build"],
        //     },
        //   },
        //   artifacts: {
        //     "base-directory": "src/build",
        //     files: "**/*",
        //   },
        // }),
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
          computeType: codebuild.ComputeType.SMALL,
        },
      }),
    });
  }

  private getDeployAction(
    input: codepipeline.Artifact,
    bucketName: string,
    constructId: string,
    runOrder: number
  ): codepipeline_actions.S3DeployAction {
    const bucket = s3.Bucket.fromBucketName(this, constructId, bucketName);

    return new codepipeline_actions.S3DeployAction({
      actionName: "Deploy",
      runOrder: runOrder,
      input: input,
      bucket: bucket,
    });
  }
}
