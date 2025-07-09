import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { hc } from 'hono/client';
import type { AppType } from '../../../server/routes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';

const client = hc<AppType>('/');

// Define the type for a region, including its missions
type RegionWithMissions = {
    id: number;
    name: string;
    missions: { id: number; name: string }[] | null;
};

// API call to fetch regions
const fetchRegions = async (): Promise<RegionWithMissions[]> => {
    const res = await client.api.regions.$get();
    if (!res.ok) {
        throw new Error('Failed to fetch regions');
    }
    return res.json();
}

export function RegionManagement() {
    const { data: regions, isLoading, isError, error } = useQuery({
        queryKey: ['regions'],
        queryFn: fetchRegions,
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Region Management</CardTitle>
                        <CardDescription>Create and manage all regions in the organization.</CardDescription>
                    </div>
                    <Button disabled> {/* TODO: Add Dialog for creation */}
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Region
                    </Button> 
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-center text-muted-foreground">Loading regions...</p>}
                {isError && <p className="text-destructive">Error: {error.message}</p>}
                <div className="space-y-4">
                    {regions?.map(region => (
                        <Card key={region.id}>
                            <CardHeader>
                                <CardTitle>{region.name}</CardTitle>
                                <CardDescription>
                                    {region.missions?.length || 0} missions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {region.missions && region.missions.length > 0 ? (
                                    <ul>
                                        {region.missions.map(mission => (
                                            <li key={mission.id} className="text-sm text-muted-foreground">{mission.name}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No missions in this region yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
