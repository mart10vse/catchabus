/**
 * Represents UI and logic of settings in companion app
 */
function Settings(props) {
  return (
    <Page>
      <Section
      // defines list of saved stops
        title={<Text bold align="center">Stops</Text>}>
        <AdditiveList
          settingsKey='stops'
          onListChange={(list) => {
            list.forEach((item) => {
              item.name = item.name;
            });
            props.settingsStorage.setItem('stops', JSON.stringify(list));
          }}
          renderItem={
            ({ name, headsign, connections }) =>
            <Section>
              <TextImageRow
                label={name}
                sublabel={headsign}>
              </TextImageRow>
              <TextImageRow sublabel={connections}/>
            </Section>
          }
          // search input field with autocomplete
          // values autocompleted can be either stop name or route short name (number of bus) 
          addAction={
            <TextInput
              title="Add a station"
              label="Station"
              placeholder="Type something"
              maxItems="20"
              onAutocomplete={(value) => {
                const c = JSON.parse(props.settingsStorage.getItem('stopslist'));
                return c.filter((item) => {
                  return item.name.toLowerCase().startsWith(value.toLowerCase()) || item.connections.startsWith(value);
                });
              }}
            />
          }
         />
      </Section>
    </Page>
  );
}

registerSettingsPage(Settings);