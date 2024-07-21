document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('calculatorForm').addEventListener('submit', function (event) {
        event.preventDefault();
        calculate();
        
    });
});

async function calculate() {
    const fromPincode = document.getElementById('fromPincode').value;
    const toPincode = document.getElementById('toPincode').value;
    const weight = document.getElementById('weight').value;
    const length = document.getElementById('length').value;
    const width = document.getElementById('width').value;
    const height = document.getElementById('height').value;
    const numItems = document.getElementById('numItems').value;

    const data = {
        fromPincode,
        toPincode,
        weight,
        length,
        width,
        height,
        numItems
    };

    try {
        const response = await fetch('/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }

        const suppliers = await response.json();
        const table = document.getElementById('suppliersTable');

        // Clear previous results
        table.innerHTML = `
            <tr>
                <th>Supplier Name</th>
                <th>Distance</th>
                <th>Weight</th>
                <th>Calculated Price</th>
                <th>Docket Charge</th>
                <th>GST(5%)</th>
                <th>Total Freight</th>
                <th>TAT</th>
            </tr>
        `;

        suppliers.forEach(supplier => {
            const row = table.insertRow();
            const cell1 = row.insertCell(0);
            const cell2 = row.insertCell(1);
            const cell3 = row.insertCell(2);
            const cell4 = row.insertCell(3);
            const cell5 = row.insertCell(4);
            const cell6 = row.insertCell(5);
            const cell7 = row.insertCell(6);
            const cell8 = row.insertCell(7);
            cell1.textContent = supplier.supplierName;
            cell2.textContent = supplier.distance.toFixed(2);
            cell3.textContent = supplier.finalWeight.toFixed(2);
            cell4.textContent = supplier.calculatedPrice.toFixed(2);
            cell5.textContent = 100;
            let x=supplier.calculatedPrice +100;
            cell6.textContent = (x*0.05).toFixed(2);
            x= x + (x*0.05);
            cell7.textContent = x.toFixed(2);
            //tat calculation
            let dis=supplier.distance.toFixed(2);
            let t=supplier.tat;
            let res_tat;
            if(dis<=500){
                let days = Math.floor(t / 24);
                let remainingHours = (t % 24).toFixed(0);
                if(remainingHours!=0){
                res_tat=`${days} d  + ${remainingHours} hr`;
                }
                else{
                    res_tat=`${days} d`;
                }
            }
            else{
                let d=dis-500;
                tot_hr=Math.floor(t / 1)+ ((t + "").split(".")[1])*(Math.floor(d/100)+1).toFixed(2);
                let days = Math.floor(tot_hr / 24);
                let remainingHours = (tot_hr % 24).toFixed(0);
             
                if(remainingHours!=0){
                    res_tat=`${days} d + ${remainingHours} hr`;
                    }
                    else{
                        res_tat=`${days} d`;
                    }
                }
            cell8.textContent =res_tat;
            console.log(supplier.absoluteWeight);
            console.log(supplier.volumetricWeight);
            document.getElementById("container2").style.visibility="visible";
        });
    } catch (error) {
        console.error('Error calculating suppliers:', error);
        alert('Error calculating suppliers: ' + error.message);
    }
}
