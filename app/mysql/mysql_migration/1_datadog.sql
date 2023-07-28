CREATE USER 'datadog'@'%' IDENTIFIED BY 'datadogagent';
GRANT REPLICATION CLIENT ON *.* TO 'datadog'@'%';
ALTER USER 'datadog'@'%' WITH MAX_USER_CONNECTIONS 5;
GRANT PROCESS ON *.* TO 'datadog'@'%';
GRANT SELECT ON performance_schema.* TO 'datadog'@'%';
