# Table Storage data model

The first version uses Azure Table Storage only.

Tables:

## Engagements
PartitionKey: ENGAGEMENT
RowKey: engagement id

Properties:
clientId
clientName
engagementNumber
taxYear
status
currentStage
owner
dueDate
createdAt
updatedAt

## EngagementStages
PartitionKey: engagement id
RowKey: stage key

Properties:
stageName
status
startedAt
completedAt
notes
updatedAt

## Activities
PartitionKey: engagement id
RowKey: activity id

Properties:
stageKey
title
status
timestamp
actor
notes

## Clients
Reserved for client master data in the next iteration.
