/**
 * Cache Status Indicator Component
 *
 * Displays a small badge showing whether data is from cache or fresh from server.
 * Useful for debugging and demonstrating the stale-while-revalidate pattern.
 *
 * Usage:
 * <CacheStatusIndicator isFetching={query.isFetching} />
 */

import { useEffect, useState } from 'react';

