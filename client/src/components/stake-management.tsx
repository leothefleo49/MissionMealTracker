import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { hc } from 'hono/client';
import type { AppType } from '../../../server/routes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { PlusCircle } from 'lucide-react';

const client = hc<AppType>('/');

type StakeWithWards = {
    id: number;
    name: string;
    wards: { id: number; name: string }[] | null;
};

const fetchStakes = async (): Promise<StakeWithWards[]> => {
    const res = await client.api.stakes.$get();
    if (!res.ok) {
        throw new Error('Failed to fetch stakes');
    }
    return res.json();
}

interface StakeManagementProps {
    missionId: number;
}

export function StakeManagement({ missionId }: StakeManagementProps) {
    const { data: stakes, isLoading, isError, error } = useQuery({
        queryKey: ['stakes', missionId],
        queryFn: fetchStakes,
    });

    return (
        <Card>
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Stake Management</CardTitle>
                        <CardDescription>Create and manage stakes within your mission.</CardDescription>
                    </div>
                    <Button disabled> {/* TODO: Add Dialog for creation */}
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Stake
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-center text-muted-foreground">Loading stakes...</p>}
                {isError && <p className="text-destructive">Error: {error.message}</p>}
                <div className="space-y-4">
                    {stakes?.map(stake => (
                        <Card key={stake.id}>
                            <CardHeader>
                                <CardTitle>{stake.name}</CardTitle>
                                <CardDescription>
                                    {stake.wards?.length || 0} wards
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stake.wards && stake.wards.length > 0 ? (
                                    <ul>
                                        {stake.wards.map(ward => (
                                            <li key={ward.id} className="text-sm text-muted-foreground">{ward.name}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No wards in this stake yet.</p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
