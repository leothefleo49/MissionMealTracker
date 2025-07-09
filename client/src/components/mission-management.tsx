import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { hc } from 'hono/client';
import type { AppType } from '../../../server/routes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';

const client = hc<AppType>('/');

type MissionWithStakes = {
    id: number;
    name: string;
    stakes: { id: number; name: string }[] | null;
};

const fetchMissions = async (): Promise<MissionWithStakes[]> => {
    const res = await client.api.missions.$get();
    if (!res.ok) {
        throw new Error('Failed to fetch missions');
    }
    return res.json();
}

interface MissionManagementProps {
    regionId: number;
}

export function MissionManagement({ regionId }: MissionManagementProps) {
    const { data: missions, isLoading, isError, error } = useQuery({
        queryKey: ['missions', regionId],
        queryFn: fetchMissions,
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Mission Management</CardTitle>
                        <CardDescription>Create and manage missions within your region.</CardDescription>
                    </div>
                    <Button disabled> {/* TODO: Add Dialog for creation */}
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Mission
                    </Button> 
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-center text-muted-foreground">Loading missions...</p>}
                {isError && <p className="text-destructive">Error: {error.message}</p>}
                 <div className="space-y-4">
                    {missions?.map(mission => (
                        <Card key={mission.id}>
                            <CardHeader>
                                <CardTitle>{mission.name}</CardTitle>
                                <CardDescription>
                                    {mission.stakes?.length || 0} stakes
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {mission.stakes && mission.stakes.length > 0 ? (
                                    <ul>
                                        {mission.stakes.map(stake => (
                                            <li key={stake.id} className="text-sm text-muted-foreground">{stake.name}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No stakes in this mission yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
