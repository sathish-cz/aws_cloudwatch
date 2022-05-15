import { Duration, Stack, StackProps, CfnOutput, Aws, aws_cloudwatch } from "aws-cdk-lib";
import * as cdk from '@aws-cdk/core';


//const { GraphWidget, Dashboard, LogQueryWidget, TextWidget,  } = require('@aws-cdk/aws-cloudwatch');

import { GraphWidget, Dashboard, LogQueryWidget, TextWidget, SingleValueWidget, Metric } from 'aws-cdk-lib/aws-cloudwatch';
//import { Function, Runtime, AssetCode } from "aws-cdk-lib/aws-lambda";
import { Construct } from 'constructs';
import { CloudWatchLogGroup } from "aws-cdk-lib/aws-events-targets";

interface SalesforceCloudwatchDashboardStackProps extends StackProps {
  dashboardName: string
}

export class SalesforceCloudwatchDashboardStack extends Stack {
  //private lambdaFunction: Function
  private dashboard: Dashboard

  constructor(scope: Construct, id: string, props: SalesforceCloudwatchDashboardStackProps) {
    super(scope, id, props);
    
    this.dashboard = new Dashboard(this, "SalesforceCloudwatchDashboard", {
      dashboardName: props.dashboardName
    })    

    // Create Title for Dashboard
    this.dashboard.addWidgets(new TextWidget({
      markdown: `# Dashboard: Salesforce EC2`,
      height: 1,
      width: 24
    }))

    // Create CloudWatch Dashboard Widgets: Errors, Invocations, Duration, Throttles

    // Create Widget to show last 20 Log Entries
    this.dashboard.addWidgets(new LogQueryWidget({
      logGroupNames: ['Bonjour-FargateServiceTaskDefwebLogGroup71FAF541-7NCzfkkZAllD'],
      queryLines:[
        "fields @timestamp, @message",
        "sort @timestamp desc",
        "limit 20"],
      width: 24,
      }))

    this.dashboard.addWidgets(new LogQueryWidget({
      title: 'Errors in my log group - stacked',
      view: aws_cloudwatch.LogQueryVisualizationType.STACKEDAREA,
      logGroupNames: ['Bonjour-FargateServiceTaskDefwebLogGroup71FAF541-7NCzfkkZAllD'],
      queryString: `fields @message
                    | filter @message like /Error/`,
    }))
    
    this.dashboard.addWidgets(new LogQueryWidget({
      title: 'Errors in my log group - pie',
      view: aws_cloudwatch.LogQueryVisualizationType.PIE,
      logGroupNames: ['Bonjour-FargateServiceTaskDefwebLogGroup71FAF541-7NCzfkkZAllD'],
      queryString: `fields @message
                    | filter @message like /Error/`,
      }));

      //const queue = new cdk.CfnResource(Salesforce-CloudwatchDashboard, 'queue', { type: 'AWS::SQS::Queue' });

      const numberOfMessagesVisibleMetric = new aws_cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfMessagesVisible',
        //dimensions: { QueueName: queue.getAtt('QueueName') },
      });
    
      const sentMessageSizeMetric = new aws_cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'SentMessageSize',
        //dimensions: { QueueName: queue.getAtt('QueueName') },
      });

      const alarm = numberOfMessagesVisibleMetric.createAlarm(this, 'Alarm', {
        threshold: 100,
        evaluationPeriods: 3,
        datapointsToAlarm: 2,
      });


      this.dashboard.addWidgets(new aws_cloudwatch.GraphWidget({
        title: 'More messages in queue with alarm annotation',
        left: [numberOfMessagesVisibleMetric],
        leftAnnotations: [alarm.toAnnotation()],
      }));

      this.dashboard.addWidgets(new aws_cloudwatch.SingleValueWidget({
        title: 'Current messages in queue',
        metrics: [numberOfMessagesVisibleMetric],
      }));
    // Generate Outputs
    const cloudwatchDashboardURL = `https://${Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${Aws.REGION}#dashboards:name=${props.dashboardName}`;
    new CfnOutput(this, 'DashboardOutput', {
      value: cloudwatchDashboardURL,
      description: 'URL of Sample CloudWatch Dashboard',
      exportName: 'SampleCloudWatchDashboardURL'
    });

  };
}
