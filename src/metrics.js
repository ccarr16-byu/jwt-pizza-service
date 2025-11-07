const config = require('./config');
const os = require('os');

class OtelMetricBuilder {
    constructor() {
        this.metrics = [];
    }

    createMetric(metricSpec) {
        const attributes = { ...metricSpec.attributes, source: config.metrics.source };

        const metric = {
            name: metricSpec.name,
            unit: metricSpec.unit,
            [metricSpec.type]: {
            dataPoints: [
                {
                [metricSpec.valueType]: metricSpec.value,
                timeUnixNano: Date.now() * 1000000,
                attributes: [],
                },
            ],
            },
        };

        Object.keys(attributes).forEach((key) => {
            metric[metricSpec.type].dataPoints[0].attributes.push({
            key: key,
            value: { stringValue: attributes[key] },
            });
        });

        if (metricSpec.type === 'sum') {
            metric[metricSpec.type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
            metric[metricSpec.type].isMonotonic = true;
        }

        return metric;
    }

    add(metricCategory) {
        for (let i = 0; i < metricCategory.length; i++) {
            this.metrics.push(this.createMetric(metricCategory[i]));
        }
    }

    sendToGrafana() {
        const body = {
            resourceMetrics: [
                {
                    scopeMetrics: [
                        {
                            metrics: this.metrics,
                        },
                    ],
                },
            ],
        };

        fetch(`${config.metrics.url}`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP status: ${response.status}`);
            }
        })
        .catch((error) => {
            console.error('Error pushing metrics:', error);
        });
    }
}

const requests = {};
let activeUsers = 0;
let successfulAuths = 0;
let unsuccessfulAuths = 0;
let pizzasSold = 0;
let revenue = 0;
let failedPizzas = 0;
let pizzaLatency = 0;
let requestLatency = 0;

function requestTracker(req, res, next) {
  const endpoint = `[${req.method}] ${req.path}`;
  requests[endpoint] = (requests[endpoint] || 0) + 1;
  next();
}

function getHttpMetrics(requests) {
    const httpMetrics = [];
    Object.keys(requests).forEach((endpoint) => {
        let metric = { name: 'requests', value: requests[endpoint], unit: '1', type: 'sum', valueType: 'asInt', attributes: { endpoint } };
        httpMetrics.push(metric);
    })
    return httpMetrics;
}

function logUser(action) {
    if (action === 'login') {
        activeUsers++;
    } else {
        activeUsers--;
    }
}

function logLatency(latency) {
    requestLatency += latency;
}

function logAuth(status) {
    if (status === 'success') {
        successfulAuths++;
    } else {
        unsuccessfulAuths++;
    }
}

function getSystemMetrics() {
    const systemMetrics = [];
    const cpuMetric = { name: 'cpu', value: getCpuUsagePercentage(), unit: '%', type: 'gauge', valueType: 'asInt', attributes: {} };
    systemMetrics.push(cpuMetric);
    const memoryMetric = { name: 'memory', value: getMemoryUsagePercentage(), unit: '%', type: 'gauge', valueType: 'asInt', attributes: {} };
    systemMetrics.push(memoryMetric);
    return systemMetrics;
}

function getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
}

function getAuthMetrics() {
    const authMetrics = [];
    const successfulAuthsMetric = { name: 'success', value: successfulAuths, unit: '1', type: 'sum', valueType: 'asInt', attributes: {} };
    authMetrics.push(successfulAuthsMetric);
    const unsuccessfulAuthsMetric = { name: 'failure', value: unsuccessfulAuths, unit: '1', type: 'sum', valueType: 'asInt', attributes: {} };
    authMetrics.push(unsuccessfulAuthsMetric);
    return authMetrics;
}

function getUserMetrics() {
    const userMetrics = [];
    const activeUsersMetric = { name: 'active', value: activeUsers, unit: '1', type: 'sum', valueType: 'asInt', attributes: {} };
    userMetrics.push(activeUsersMetric);
    return userMetrics;
}

function pizzaPurchase(status, latency, price, order_size) {
    if (status !== 'success') {
        failedPizzas++;
    }
    pizzaLatency += latency;
    revenue += price;
    pizzasSold += order_size;
}

function getLatencyMetrics() {
    const latencyMetrics = [];
    const endpointLatencyMetric = { name: 'request latency', value: requestLatency, unit: 'ms', type: 'sum', valueType: 'asInt', attributes: {} };
    latencyMetrics.push(endpointLatencyMetric);
    const pizzaLatencyMetric = { name: 'pizza latency', value: pizzaLatency, unit: 'ms', type: 'sum', valueType: 'asInt', attributes: {} };
    latencyMetrics.push(pizzaLatencyMetric);
    return latencyMetrics;
}

function getPizzaMetrics() {
    const pizzaMetrics = [];
    const pizzasSoldMetric = { name: 'pizza purchases', value: pizzasSold, unit: '1', type: 'sum', valueType: 'asInt', attributes: {} };
    pizzaMetrics.push(pizzasSoldMetric);
    const failedPizzasMetric = { name: 'purchase failures', value: failedPizzas, unit: '1', type: 'sum', valueType: 'asInt', attributes: {} };
    pizzaMetrics.push(failedPizzasMetric);
    const revenueMetric = { name: 'revenue', value: revenue, unit: '1', type: 'sum', valueType: 'asInt', attributes: {} };
    pizzaMetrics.push(revenueMetric);
    return pizzaMetrics;
}

function sendMetricsPeriodically(period) {
    setInterval(() => {
        try {
            const metrics = new OtelMetricBuilder();
            metrics.add(getHttpMetrics(requests));
            metrics.add(getSystemMetrics());
            metrics.add(getAuthMetrics());
            metrics.add(getUserMetrics());
            metrics.add(getLatencyMetrics());
            metrics.add(getPizzaMetrics());

            metrics.sendToGrafana();
        } catch (error) {
            console.log('Error sending metrics', error);
        }
    }, period);
}

sendMetricsPeriodically(10000);

module.exports = { requestTracker, logUser, logAuth, logLatency, pizzaPurchase };