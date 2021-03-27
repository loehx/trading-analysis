
class Bar {

    constructor(data) {
        this.data = data;
    }


	validate() {

        if (!serie) {
            return error('empty or null');
        }
        ['timestamp', 'low', 'high', 'open', 'close', 'volume'].forEach(name => {
            if (typeof serie[name] === 'undefined' || serie[name] === null) {
                error('property missing: "' + name + '"');
            }
        })
        const { timestamp, low, high, open, close, volume } = serie;
        if (!timestamp.isValid()) {
            error('timestamp is not valid');
        }
        if (high < low) {
            error('assertion failed: high > low');
        }
        if (!(open >= low && close >= low)) {
            error('assertion failed: open >= low && close >= low');
        }
        if (!(open <= high && close <= high)) {
            error('assertion failed: open <= high && close <= high');
        }
	
    }
}