// Compiled fragment from ../../packages/platform-interface/metrics/index.ts.
// The original TypeScript and import graph are not restored.



/** Validates the whole batch before recording anything, then snapshots its dimensions. */ const prepareMetricPoints = (params, ownerAttributes)=>{
    assertContractValue('PushMetricsParams', params);
    for (const metric of params.metrics){
        if (metric.name.trim().length === 0 || metric.unit !== undefined && metric.unit.trim().length === 0 || metric.type === 'counter' && metric.value < 0) {
            const error = {
                code: base_InterfaceErrorCode.InvalidArgument,
                message: 'Metrics require a non-empty name and unit, and non-negative counter values.'
            };
            throw error;
        }
    }
    return params.metrics.map((metric)=>({
            ...metric,
            attributes: {
                ...params.attributes,
                ...metric.attributes,
                ...ownerAttributes
            }
        }));
};
