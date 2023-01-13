import { Construct } from "constructs";
import { Stack, StackProps } from "aws-cdk-lib";
import {
  Cluster,
  ContainerImage,
  Ec2Service,
  Ec2TaskDefinition,
  LogDriver,
  Secret,
} from "aws-cdk-lib/aws-ecs";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { LogGroup } from "aws-cdk-lib/aws-logs";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const cluster = new Cluster(this, "Cluster");

    const containerUserId = 1001; // the same user id as the container user - sudo useradd -u 1001 runner

    cluster
      .addCapacity("ec2", {
        instanceType: InstanceType.of(
          InstanceClass.BURSTABLE3_AMD,
          InstanceSize.MICRO
        ),
        keyName: "c4h",
        spotPrice: "0.05",
      })
      .addUserData(
        `sudo setfacl --modify user:${containerUserId}:rw /var/run/docker.sock` // this line will update permissions on the host docker socket
      );

    /**
     *  containerUserId must contain the id of the user runner on GitHub Runner
     *  ex:
     *    containerUserId=1001
     *    sudo useradd -u 1001 runner
     */

    const taskDefinition = new Ec2TaskDefinition(this, "TaskDef");

    taskDefinition.addVolume({
      name: "docker",
      host: {
        sourcePath: "/var/run/docker.sock",
      },
    });

    const containerDefinition = taskDefinition.addContainer("TheContainer", {
      image: ContainerImage.fromRegistry("myoung34/github-runner"), //only for testing because your Dockerfile has as lot of internal things
      memoryLimitMiB: 256,
      privileged: true,
      environment: {
        REPO_URL: "https://github.com/cloud-devops-expert/aws-infra",
        RUN_AS_ROOT: "false", // the container is using the runner user
      },
      secrets: {
        ACCESS_TOKEN: Secret.fromSsmParameter(
          StringParameter.fromSecureStringParameterAttributes(this, "PAT", {
            parameterName: "PAT",
          })
        ),
      },
      logging: LogDriver.awsLogs({
        streamPrefix: "github",
        logGroup: new LogGroup(this, "ecs-github", {
          logGroupName: "ecs/github/runner",
        }),
      }),
    });

    containerDefinition.addMountPoints({
      readOnly: false,
      containerPath: "/var/run/docker.sock",
      sourceVolume: "docker",
    });

    new Ec2Service(this, "service", {
      cluster,
      taskDefinition,
      desiredCount: 1,
    });
  }
}
