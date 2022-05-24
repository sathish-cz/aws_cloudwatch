import { Duration, Stack, StackProps, CfnOutput, Aws, aws_cloudwatch } from "aws-cdk-lib";
import * as cdk from 'aws-cdk-lib';
// import { APIGatewayProxyEvent } from "aws-lambda";
//const { GraphWidget, Dashboard, LogQueryWidget, TextWidget,  } = require('@aws-cdk/aws-cloudwatch');
import { GraphWidget, Dashboard , LogQueryWidget, TextWidget, SingleValueWidget, Metric } from 'aws-cdk-lib/aws-cloudwatch';
//import { Function, Runtime, AssetCode } from "aws-cdk-lib/aws-lambda";
import { Construct } from 'constructs';
import { CloudWatchLogGroup } from "aws-cdk-lib/aws-events-targets";
//import { Service } from './service';
import { MathExpression, Statistic } from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
//import * as awsx from '@pulumi/awsx';

interface SalesforceCloudwatchDashboardStackProps extends StackProps {
  dashboardName: string
  
}

export class SalesforceCloudwatchDashboardStack extends Stack {
  //private lambdaFunction: Function
  private dashboard: Dashboard
  public readonly blueGroupAlarm: aws_cloudwatch.Alarm;
  //private readonly period: aws_cloudwatch.PeriodOverride

  constructor(scope: Construct, id: string, props: SalesforceCloudwatchDashboardStackProps) {
    super(scope, id, props);
    
    this.dashboard = new Dashboard(this, "SalesforceCloudwatchDashboard", {
      dashboardName: props.dashboardName
    }) 


    // Create Title for Dashboard
    this.dashboard.addWidgets(new TextWidget({
      markdown: `# Dashboard: Salesforce ECS`,
      height: 1,
      width: 24
    }))

      //const serviceLink = `https://console.aws.amazon.com/ecs/home?region=${region}#/clusters/${ecsService.cluster.clusterName}/services/${ecsService.serviceName}/details`;

      const serviceLink = `https://us-west-1.console.aws.amazon.com/ecs/home?region=us-west-1#/clusters/SamplePHP-ClusterEB0386A7-LMIJVDtEJwAk/services`;
      this.dashboard.addWidgets(
        new TextWidget({
          markdown: `### ECS Service: [FargateService](${serviceLink})`,
          width: 24,
          height: 1,
        }),
      );

      const lblink = `https://us-west-1.console.aws.amazon.com/ec2/v2/home?region=us-west-1#LoadBalancers:search=Sampl-Farga-TLVJIA9MVQ1S;sort=loadBalancerName`;

      this.dashboard.addWidgets(
        new TextWidget({
          markdown: [
            `### Load Balancer: [Loadbalancer](${lblink})`,
          ].join(' | '),
          width: 24,
          height: 1,
        }),
      );

      const Endpoint = `http://Sampl-Farga-TLVJIA9MVQ1S-868004026.us-west-1.elb.amazonaws.com`

      this.dashboard.addWidgets(
        new TextWidget({
          markdown: [
            `### ECS Endponint: [Endpoint](${Endpoint})`,
          ].join(' | '),
          width: 24,
          height: 1,
        }),
      );
    // Create CloudWatch Dashboard Widgets: Errors, Invocations, Duration, Throttles

    // Create Widget to show last 20 Log Entries

    const statsWidget = new SingleValueWidget({
      title: 'Statistics over the last hour (Kinesis Analytics Application)',
      metrics: [],
      width: 9,
      height: 3,
    });
    statsWidget.position(4, 0);
    this.dashboard.addWidgets(statsWidget);

    this.dashboard.addWidgets(new LogQueryWidget({
      logGroupNames: ['SamplePHP-FargateServiceTaskDefwebLogGroup71FAF541-r06ivnztdzze'],
      queryLines:[
        "fields @timestamp, @message",
        "sort @timestamp desc",
        "limit 20"],
      width: 24,
      }));

    this.dashboard.addWidgets(new LogQueryWidget({
      title: 'Errors in my log group - stacked',
      view: aws_cloudwatch.LogQueryVisualizationType.STACKEDAREA,
      logGroupNames: ['SamplePHP-FargateServiceTaskDefwebLogGroup71FAF541-r06ivnztdzze'],
      queryString: `fields @message
                    | filter @message like /Error/`,
      width: 12,
      height: 6,
                    
    }))
    
    this.dashboard.addWidgets(new LogQueryWidget({
      title: 'Errors in my log group - pie',
      view: aws_cloudwatch.LogQueryVisualizationType.PIE,
      logGroupNames: ['SamplePHP-FargateServiceTaskDefwebLogGroup71FAF541-r06ivnztdzze'],
      queryString: `fields @message
                    | filter @message like /Error/`,
      width: 12,
      height: 6,
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

      const blueGroupMetric = new aws_cloudwatch.Metric({
        namespace: "AWS/ApplicationELB",
        metricName: "HTTPCode_Target_4XX_Count",
        dimensionsMap: {
           //TargetGroup: "targetgroup/Blue-Group/c636ee69f1c01097",
           LoadBalancer: "app/Sampl-Farga-TLVJIA9MVQ1S/fe6e3ea218565b9a",
        },
        statistic: aws_cloudwatch.Statistic.SUM,
        period: Duration.minutes(1),
     });

     this.blueGroupAlarm = new aws_cloudwatch.Alarm(this, "blue4xxErrors", {
      alarmName: "Blue_4xx_Alarm",
      alarmDescription: "CloudWatch Alarm for the 4xx errors of Blue target group",
      metric: blueGroupMetric,
      threshold: 1,
      evaluationPeriods: 1,
   });     

      this.dashboard.addWidgets(new aws_cloudwatch.SingleValueWidget({
        title: "AWS/ApplicationELB",
        metrics: [blueGroupMetric],
     }))
     ;


     const LBWidget = new aws_cloudwatch.GraphWidget({
        title: 'Sum of 2XX responses per hour',
        stacked: false,
        left: [
          new aws_cloudwatch.Metric({
            namespace: 'AWS/ApplicationELB',
            dimensionsMap: {
              'LoadBalancer': 'app/Sampl-Farga-TLVJIA9MVQ1S/fe6e3ea218565b9a',
            },
            metricName: 'HTTPCode_Target_2XX_Count',
            period: cdk.Duration.seconds(3600),
            statistic: aws_cloudwatch.Statistic.SUM,
          }),
        ],
      })

      this.dashboard.addWidgets(LBWidget);
  
    // Generate Outputs
    const cloudwatchDashboardURL = `https://${Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${Aws.REGION}#dashboards:name=${props.dashboardName}`;
    new CfnOutput(this, 'DashboardOutput', {
      value: cloudwatchDashboardURL,
      description: 'URL of Sample CloudWatch Dashboard',
      exportName: 'SampleCloudWatchDashboardURL'
    });
  
  };
}
