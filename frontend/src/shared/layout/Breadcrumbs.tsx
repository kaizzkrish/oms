import { Breadcrumbs as MuiBreadcrumbs, Link as MuiLink, Typography } from '@mui/material';
import { Link, useMatches } from 'react-router';

interface CrumbHandle {
  crumb?: () => string;
}

export function Breadcrumbs() {
  const matches = useMatches();
  const crumbs = matches
    .filter((match) => Boolean((match.handle as CrumbHandle | undefined)?.crumb))
    .map((match) => ({
      label: (match.handle as CrumbHandle).crumb!(),
      pathname: match.pathname,
    }));

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <MuiBreadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      {crumbs.map((crumb, index) =>
        index === crumbs.length - 1 ? (
          <Typography key={crumb.pathname} color="text.primary">
            {crumb.label}
          </Typography>
        ) : (
          <MuiLink
            key={crumb.pathname}
            component={Link}
            to={crumb.pathname}
            underline="hover"
            color="inherit"
          >
            {crumb.label}
          </MuiLink>
        ),
      )}
    </MuiBreadcrumbs>
  );
}
