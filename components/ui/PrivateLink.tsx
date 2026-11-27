import NextLink from 'next/link';
import type {ComponentProps} from 'react';

/** Authenticated archive navigation: keep Next client transitions, but avoid
 * speculative RSC requests until the user actually chooses a destination.
 * Public navigation is unaffected; explicit prefetch can still be opted in. */
export default function PrivateLink({prefetch=false,...props}:ComponentProps<typeof NextLink>){
 return <NextLink {...props} prefetch={prefetch}/>;
}
