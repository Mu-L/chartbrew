import { findSourceForConnection, getSourceLogo } from "../sources";

export default function getConnectionLogo(connection, isDark) {
  const source = findSourceForConnection(connection);

  return getSourceLogo(source, isDark);
}
