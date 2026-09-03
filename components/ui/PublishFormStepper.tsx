import Stepper, { Step } from './Stepper';

/*

me pasas los formularios de aviones y de repuestos al modelo de stepper (sacado de la pagina reactbits)?



import Stepper, { Step } from './Stepper';




export const PublishFormStepper = () => {




return <Stepper

initialStep={1}

onStepChange={(step) => {

console.log(step);

        }}

onFinalStepCompleted={() => console.log("All steps completed!")}

backButtonText="Previous"

nextButtonText="Next"

>

<Step>

<h2>Welcome to the React Bits stepper!</h2>

<p>Check out the next step!</p>

</Step>

<Step>

<h2>Step 2</h2>

<img style={{ height: '100px', width: '100%', objectFit: 'cover', objectPosition: 'center -70px', borderRadius: '15px', marginTop: '1em' }} src="https://www.purrfectcatgifts.co.uk/cdn/shop/collections/Funny_Cat_Cards_640x640.png?v=1663150894" />

<p>Custom step content!</p>

</Step>

<Step>

<h2>How about an input?</h2>

<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name?"

disableStepIndicators={false}

/>

</Step>

<Step>

<h2>Final Step</h2>

<p>You made it!</p>

</Step>

</Stepper>

}



por parte de la aeronave quiero que los pasos se dividan asi: (* campos obligatorios)

paso 1: titulo *, marca * y modelo *

paso 2: ciudad * y provincia *

paso 3: año *, horas totales *, categoría * y precio (opción de a consultar) *

paso 4: descripción *

paso 5: estado del fuselaje y modificaciones

paso 6: logica de motores

paso 7: logica de helices

paso 8 (ultimo paso con boton de publicar): fotos *(al menos una)



por parte de los repuestos quiero que los pasos se dividan asi: (* campos obligatorios)

paso 1: titulo, categoria principal y subcategoria

*/


export const PublishFormStepper = () => {

    return <Stepper
        initialStep={1}
        onStepChange={(step) => {
            console.log(step);
        }}
        onFinalStepCompleted={() => console.log("All steps completed!")}
        backButtonText="Previous"
        nextButtonText="Next"
    >
        <Step>
            <h2>Welcome to the React Bits stepper!</h2>
            <p>Check out the next step!</p>
        </Step>
        <Step>
            <h2>Step 2</h2>
            <img style={{ height: '100px', width: '100%', objectFit: 'cover', objectPosition: 'center -70px', borderRadius: '15px', marginTop: '1em' }} src="https://www.purrfectcatgifts.co.uk/cdn/shop/collections/Funny_Cat_Cards_640x640.png?v=1663150894" />
            <p>Custom step content!</p>
        </Step>
        <Step>
            <h2>How about an input?</h2>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name?"
        disableStepIndicators={false}
        />
        </Step>
        <Step>
            <h2>Final Step</h2>
            <p>You made it!</p>
        </Step>
    </Stepper>
}