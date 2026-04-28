import connectionImages from "../config/connectionImages";
import { findSourceForConnection, getSourceLogo } from "../sources";

export default function getConnectionLogo(connection, isDark) {
  const source = findSourceForConnection(connection);
  const registryLogo = getSourceLogo(source, isDark);

  if (registryLogo) return registryLogo;

  return connectionImages(isDark)[connection?.subType || connection?.type] || null;
}
