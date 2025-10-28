#!/bin/bash

echo "Waiting for MongoDB instances to start..."
sleep 30

echo "Configuring replica set..."

mongosh --host mongo1:27017 -u admin -p echovote_admin_password --authenticationDatabase admin --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongo1:27017', priority: 2 },
    { _id: 1, host: 'mongo2:27017', priority: 1 },
    { _id: 2, host: 'mongo3:27017', priority: 1 }
  ]
})
"

echo "Waiting for replica set to stabilize..."
sleep 20

echo "Creating application database and user..."
mongosh --host mongo1:27017 -u admin -p echovote_admin_password --authenticationDatabase admin --eval "
use echovote;
db.createUser({
  user: 'echovote_user',
  pwd: 'echovote_user_password',
  roles: [
    { role: 'readWrite', db: 'echovote' }
  ]
});
"

echo "Replica set setup complete!"
