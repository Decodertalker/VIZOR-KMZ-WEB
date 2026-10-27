package com.cajasgpon.app;

import android.app.job.JobParameters;
import android.app.job.JobService;

/** Se ejecuta cada ~15 minutos aunque la app esté cerrada, para avisar de nuevas asignaciones. */
public class PollJobService extends JobService {
    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Notifier.poll(getApplicationContext(), true);
                } catch (Throwable ignored) {
                }
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}
