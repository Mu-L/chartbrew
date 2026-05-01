import mongoLogo from "../sources/mongodb/assets/mongodb-logo.png";
import firebaseLogo from "../sources/realtimedb/assets/rd-light.webp";
import firestoreLogo from "../sources/firestore/assets/firestore-light.webp";
import postgresLogo from "../sources/postgres/assets/postgres.png";
import gAnalyticsLogo from "../assets/GoogleAnalytics.webp";
import mysqlLogo from "../sources/mysql/assets/mysql.png";
import apiLogo from "../assets/api.png";
import plausibleLogo from "../assets/plausible-logo.png";
import customerioLogo from "../sources/customerio/assets/customerio-light.webp";
import mongoDarkLogo from "../sources/mongodb/assets/mongodb-dark.png";
import firebaseDarkLogo from "../sources/realtimedb/assets/rd-dark.webp";
import firestoreDarkLogo from "../sources/firestore/assets/firestore-dark.webp";
import postgresDarkLogo from "../sources/postgres/assets/postgres-dark.png";
import googleanalyticsDarkLogo from "../assets/googleanalytics-dark.png";
import mysqlDarkLogo from "../sources/mysql/assets/mysql-dark.png";
import apiDarkLogo from "../assets/api-dark.png";
import plausibleDarkLogo from "../assets/plausible-dark.png";
import customerioDarkLogo from "../sources/customerio/assets/customerio-dark.webp";
import timescaledbLogo from "../sources/timescaledb/assets/timescale-light.webp";
import timescaledbDarkLogo from "../sources/timescaledb/assets/timescale-dark.webp";
import simpleAnalyticsLogo from "../assets/simpleAnalytics.png";
import simpleAnalyticsDarkLogo from "../assets/simpleAnalytics-dark.png";
import mailgunLogo from "../assets/mailgun_logo.webp";
import mailgunDarkLogo from "../assets/mailgun-dark.png";
import chartMogulLogo from "../assets/ChartMogul.webp";
import chartMogulDarkLogo from "../assets/ChartMogul-dark.png";
import strapiLogo from "../assets/strapi-connection.webp";
import strapiDarkLogo from "../assets/Strapi-dark.png";
import stripeLogo from "../sources/stripe/assets/stripe-connection.webp";
import stripeDarkLogo from "../sources/stripe/assets/stripe-dark.png";
import supabaseLogo from "../sources/supabasedb/assets/supabase-connection.webp";
import supabaseDarkLogo from "../sources/supabasedb/assets/Supabase-dark.png";
import rdsPostgresLogo from "../sources/rdspostgres/assets/rds.png";
import rdsPostgresDarkLogo from "../sources/rdspostgres/assets/rds-dark.png";
import rdsMysqlLogo from "../sources/rdsmysql/assets/rds.png";
import rdsMysqlDarkLogo from "../sources/rdsmysql/assets/rds-dark.png";
import clickhouseLogo from "../sources/clickhouse/assets/clickhouse-light.svg";
import clickhouseDarkLogo from "../sources/clickhouse/assets/clickhouse-dark.svg";

export default (isDark) => ({
  mongodb: isDark ? mongoDarkLogo : mongoLogo,
  firestore: isDark ? firestoreDarkLogo : firestoreLogo,
  realtimedb: isDark ? firebaseDarkLogo : firebaseLogo,
  postgres: isDark ? postgresDarkLogo : postgresLogo,
  api: isDark ? apiDarkLogo : apiLogo,
  mysql: isDark ? mysqlDarkLogo : mysqlLogo,
  googleAnalytics: isDark ? googleanalyticsDarkLogo : gAnalyticsLogo,
  plausible: isDark ? plausibleDarkLogo : plausibleLogo,
  customerio: isDark ? customerioDarkLogo : customerioLogo,
  timescaledb: isDark ? timescaledbDarkLogo : timescaledbLogo,
  simpleanalytics: isDark ? simpleAnalyticsDarkLogo : simpleAnalyticsLogo,
  mailgun: isDark ? mailgunDarkLogo : mailgunLogo,
  chartmogul: isDark ? chartMogulDarkLogo : chartMogulLogo,
  strapi: isDark ? strapiDarkLogo : strapiLogo,
  stripe: isDark ? stripeDarkLogo : stripeLogo,
  supabase: isDark ? supabaseDarkLogo : supabaseLogo,
  supabasedb: isDark ? supabaseDarkLogo : supabaseLogo,
  supabaseapi: isDark ? supabaseDarkLogo : supabaseLogo,
  rdsPostgres: isDark ? rdsPostgresDarkLogo : rdsPostgresLogo,
  rdsMysql: isDark ? rdsMysqlDarkLogo : rdsMysqlLogo,
  clickhouse: isDark ? clickhouseDarkLogo : clickhouseLogo,
});
