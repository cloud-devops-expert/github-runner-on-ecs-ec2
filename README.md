# GitHub Runner running on ECS EC2 provider

## Introduction

- the EC2 instance is the host for the GitHub Runners
- the Docker is installed on the host
- it requires permission changes to allow the call for non-root users from containers

## Context

- the current project creates a test ECS cluster and runs the GitHub Runner from `myoung34/github-runner`
- it is only a lab environment to examplify the required configurations by layer

## Steps

- ex.: containerUserId=1001
- create a user account on the container image using a hardcoded user id:
    - `sudo useradd -u ${containerUserId} runner`
- on the host launch configuration userdata, please put the command:
    - `sudo setfacl --modify user:${containerUserId}:rw /var/run/docker.sock`
- these instructions should fix the permission problems

## Conclusion

- most of the permission problems in this scenario come from host configurations and are not container specific
- I have tested with e2e process and the results are consistent
- the provided Dockerfile was too complex to put working on my local machine because contains several company specific
  configurations, but the knowledge is transferable 
