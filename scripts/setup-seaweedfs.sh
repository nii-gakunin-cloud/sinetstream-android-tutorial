#!/bin/bash
set -euo pipefail

SEAWEEDFS_BUCKET="${SEAWEEDFS_BUCKET:-sensor-data}"

# Wait for SeaweedFS master to be ready
until curl -sf http://localhost:9333/cluster/status > /dev/null 2>&1; do
  sleep 2
done

# Create public-read policy file
cat > /tmp/public-read-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${SEAWEEDFS_BUCKET}",
        "arn:aws:s3:::${SEAWEEDFS_BUCKET}/*"
      ]
    }
  ]
}
EOF

# Configure S3 identities, policy, and create bucket
weed shell -master=localhost:9333 <<EOS
s3.configure -apply -user admin -access_key minioadmin -secret_key minioadmin -actions Admin,Read,Write
s3.policy -put -name public-read -file /tmp/public-read-policy.json
s3.configure -apply -user anonymous -actions Read,List -buckets ${SEAWEEDFS_BUCKET} -policies public-read
s3.bucket.create -name ${SEAWEEDFS_BUCKET}
EOS

rm -f /tmp/public-read-policy.json
