#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SalesforceCloudwatchDashboardStack } from '../lib/loggroup-cloudwatch-dashboard-stack';

export const cloudwatchDashboardName = "Datahub-Salesforce-cdk-dashboard"

const app = new cdk.App();
new SalesforceCloudwatchDashboardStack(app, 'SalesforceCloudwatchDashboardStack', {
  dashboardName: cloudwatchDashboardName,
});
